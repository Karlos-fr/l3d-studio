// ============================================================================
// Emulator - Photon virtuel du cube L3D, compile avec Emscripten
// ----------------------------------------------------------------------------
// Ce fichier implemente la surcouche Particle (temps, delais Asyncify, EEPROM,
// minuteries, prise TCP virtuelle), une NeoPixel virtuelle fidele au pilote
// d'origine (ordre GRB, luminosite), puis inclut le firmware complet en unity
// build. Il exporte au JavaScript : setup/tick, image des LED, requetes HTTP.
// ============================================================================

#include <emscripten.h>
#include <time.h>
#include "application.h"
#include "platform/neopixel.h"

// ============================================================================
// Temps, hasard et GPIO
// ============================================================================

static double emulatorStartMs = emscripten_get_now();

unsigned long millis(void) { return static_cast<unsigned long>(emscripten_get_now() - emulatorStartMs); }
unsigned long micros(void) { return static_cast<unsigned long>((emscripten_get_now() - emulatorStartMs) * 1000.0); }

// Rend la main au navigateur : grace a Asyncify, la pile C++ est suspendue puis reprise.
void delay(unsigned long ms) { emscripten_sleep(ms); }
void delayMicroseconds(unsigned int us) { if (us >= 1000) emscripten_sleep(us / 1000); }

static uint32_t emulatorRandomState = 0x6D2B79F5u;
static uint32_t emulatorNextRandom(void) {
  uint32_t x = emulatorRandomState;
  x ^= x << 13; x ^= x >> 17; x ^= x << 5;
  emulatorRandomState = x;
  return x;
}
long random(long howbig) { return howbig <= 0 ? 0 : static_cast<long>(emulatorNextRandom() % static_cast<uint32_t>(howbig)); }
long random(long howsmall, long howbig) { return howsmall >= howbig ? howsmall : howsmall + random(howbig - howsmall); }
void randomSeed(unsigned int seed) { if (seed != 0) emulatorRandomState = seed; }
long map(long value, long fromStart, long fromEnd, long toStart, long toEnd) {
  if (fromEnd == fromStart) return toStart;
  return (value - fromStart) * (toEnd - toStart) / (fromEnd - fromStart) + toStart;
}

void pinMode(uint16_t, uint8_t) {}
void digitalWrite(uint16_t, uint8_t) {}
int32_t digitalRead(uint16_t) { return LOW; }
int32_t analogRead(uint16_t) { return 2048; }
void analogWrite(uint16_t, uint32_t) {}

EmulatorSerial Serial;
EmulatorWiFi WiFi;
EmulatorParticle Particle;
EmulatorSystem System;
EmulatorRGB RGB;
EmulatorTime Time;
EmulatorEEPROM EEPROM;

// Demande de redemarrage : le JavaScript la lit et relance setup().
static bool emulatorResetRequested = false;
void EmulatorSystem::reset() { emulatorResetRequested = true; }

// ============================================================================
// Heure locale : UTC du navigateur decale par Time.zone().
// ============================================================================

static struct tm emulatorNow(float offsetHours) {
  time_t seconds = time(NULL) + static_cast<time_t>(offsetHours * 3600.0f);
  struct tm parts;
  gmtime_r(&seconds, &parts);
  return parts;
}
int EmulatorTime::hour() { return emulatorNow(offsetHours).tm_hour; }
int EmulatorTime::hourFormat12() { int h = hour() % 12; return h == 0 ? 12 : h; }
bool EmulatorTime::isAM() { return hour() < 12; }
bool EmulatorTime::isPM() { return !isAM(); }
int EmulatorTime::minute() { return emulatorNow(offsetHours).tm_min; }
int EmulatorTime::second() { return emulatorNow(offsetHours).tm_sec; }
int EmulatorTime::day() { return emulatorNow(offsetHours).tm_mday; }
int EmulatorTime::weekday() { return emulatorNow(offsetHours).tm_wday + 1; }
int EmulatorTime::month() { return emulatorNow(offsetHours).tm_mon + 1; }
int EmulatorTime::year() { return emulatorNow(offsetHours).tm_year + 1900; }
long EmulatorTime::now() { return static_cast<long>(time(NULL)); }

// ============================================================================
// Minuteries logicielles, declenchees entre deux passages de loop().
// ============================================================================

Timer* Timer::first = NULL;
Timer::Timer(unsigned period, Callback cb, bool once)
    : periodMs(period), callback(cb), oneShot(once), active(false), dueAt(0), next(first) { first = this; }
void Timer::start() { active = true; dueAt = millis() + periodMs; }
void Timer::stop() { active = false; }
void Timer::reset() { if (active) dueAt = millis() + periodMs; }
void Timer::poll(void) {
  unsigned long now = millis();
  for (Timer* timer = first; timer != NULL; timer = timer->next) {
    if (!timer->active || static_cast<long>(now - timer->dueAt) < 0) continue;
    if (timer->oneShot) timer->active = false; else timer->dueAt = now + timer->periodMs;
    if (timer->callback != NULL) timer->callback();
  }
}

// ============================================================================
// EEPROM : memoire effacee (0xFF) ; le JavaScript la sauvegarde quand elle change.
// ============================================================================

uint8_t emulatorEeprom[EMULATOR_EEPROM_SIZE];
static bool emulatorEepromDirty = false;
static bool emulatorEepromReady = (memset(emulatorEeprom, 0xFF, EMULATOR_EEPROM_SIZE), true);
void emulatorEepromChanged(void) { emulatorEepromDirty = true; }

// ============================================================================
// Prise TCP virtuelle : une transaction HTTP a la fois.
// ============================================================================

#define EMULATOR_REQUEST_MAX 2048
#define EMULATOR_RESPONSE_MAX 4096
static uint8_t emulatorRequest[EMULATOR_REQUEST_MAX];
static int emulatorRequestLength = 0;
static int emulatorRequestPosition = 0;
static bool emulatorRequestPending = false;
static bool emulatorClientOpen = false;
static uint8_t emulatorResponse[EMULATOR_RESPONSE_MAX];
static int emulatorResponseLength = 0;
static bool emulatorResponseReady = false;

TCPClient TCPServer::available() {
  if (emulatorRequestPending && !emulatorClientOpen) {
    emulatorRequestPending = false;
    emulatorClientOpen = true;
    emulatorRequestPosition = 0;
    emulatorResponseLength = 0;
    return TCPClient(1);
  }
  return TCPClient();
}
int TCPClient::available() { return handle == 1 && emulatorClientOpen ? emulatorRequestLength - emulatorRequestPosition : 0; }
int TCPClient::read() { return available() > 0 ? emulatorRequest[emulatorRequestPosition++] : -1; }
int TCPClient::read(uint8_t* buffer, size_t size) {
  int count = 0;
  while (count < static_cast<int>(size) && available() > 0) buffer[count++] = emulatorRequest[emulatorRequestPosition++];
  return count;
}
size_t TCPClient::write(uint8_t value) { return write(&value, 1); }
size_t TCPClient::write(const uint8_t* buffer, size_t size) {
  if (handle != 1 || !emulatorClientOpen) return 0;
  size_t room = static_cast<size_t>(EMULATOR_RESPONSE_MAX - emulatorResponseLength);
  size_t count = size < room ? size : room;
  memcpy(emulatorResponse + emulatorResponseLength, buffer, count);
  emulatorResponseLength += static_cast<int>(count);
  return count;
}
bool TCPClient::connected() { return handle == 1 && emulatorClientOpen; }
void TCPClient::stop() {
  if (handle == 1 && emulatorClientOpen) { emulatorClientOpen = false; emulatorResponseReady = true; }
  handle = -1;
}

// ============================================================================
// NeoPixel virtuelle : meme stockage que le pilote d'origine, show() compte les images.
// ============================================================================

static uint32_t emulatorShowCount = 0;

Adafruit_NeoPixel::Adafruit_NeoPixel(uint16_t n, uint8_t p, uint8_t t)
    : numLEDs(n), numBytes(n * 3), type(t), pin(p), brightness(0), pixels(NULL), endTime(0) {
  pixels = static_cast<uint8_t*>(calloc(numBytes, 1));
}
Adafruit_NeoPixel::~Adafruit_NeoPixel() { free(pixels); }
void Adafruit_NeoPixel::begin(void) {}
void Adafruit_NeoPixel::setPin(uint8_t p) { pin = p; }
// Une WS2812B recoit 24 bits a 800 kHz : 512 LED prennent environ 15,4 ms, latch compris.
// show() attend ce meme temps, ce qui donne aux animations leur vraie vitesse et rend la
// main au navigateur entre deux images.
void Adafruit_NeoPixel::show(void) {
  emulatorShowCount += 1;
  emscripten_sleep(15);
}
void Adafruit_NeoPixel::setPixelColor(uint16_t n, uint8_t r, uint8_t g, uint8_t b) {
  if (n >= numLEDs) return;
  if (brightness) { r = (r * brightness) >> 8; g = (g * brightness) >> 8; b = (b * brightness) >> 8; }
  uint8_t* p = &pixels[n * 3];
  if (type == WS2812B || type == WS2812B2) { p[0] = g; p[1] = r; p[2] = b; }
  else { p[0] = r; p[1] = g; p[2] = b; }
}
void Adafruit_NeoPixel::setPixelColor(uint16_t n, uint32_t c) {
  setPixelColor(n, static_cast<uint8_t>(c >> 16), static_cast<uint8_t>(c >> 8), static_cast<uint8_t>(c));
}
uint32_t Adafruit_NeoPixel::Color(uint8_t r, uint8_t g, uint8_t b) {
  return (static_cast<uint32_t>(r) << 16) | (static_cast<uint32_t>(g) << 8) | b;
}
uint32_t Adafruit_NeoPixel::getPixelColor(uint16_t n) const {
  if (n >= numLEDs) return 0;
  const uint8_t* p = &pixels[n * 3];
  uint32_t c = (type == WS2812B || type == WS2812B2)
    ? (static_cast<uint32_t>(p[1]) << 16) | (static_cast<uint32_t>(p[0]) << 8) | p[2]
    : (static_cast<uint32_t>(p[0]) << 16) | (static_cast<uint32_t>(p[1]) << 8) | p[2];
  if (brightness) {
    uint8_t* parts = reinterpret_cast<uint8_t*>(&c);
    parts[0] = (parts[0] << 8) / brightness; parts[1] = (parts[1] << 8) / brightness; parts[2] = (parts[2] << 8) / brightness;
  }
  return c;
}
uint8_t* Adafruit_NeoPixel::getPixels(void) const { return pixels; }
uint16_t Adafruit_NeoPixel::numPixels(void) const { return numLEDs; }
void Adafruit_NeoPixel::setBrightness(uint8_t b) {
  uint8_t newBrightness = b + 1;
  if (newBrightness == brightness) return;
  uint8_t oldBrightness = brightness - 1;
  uint16_t scale = oldBrightness == 0 ? 0 : b == 255 ? 65535 / oldBrightness : ((static_cast<uint16_t>(newBrightness) << 8) - 1) / oldBrightness;
  for (uint16_t i = 0; i < numBytes; i++) pixels[i] = (pixels[i] * scale) >> 8;
  brightness = newBrightness;
}
uint8_t Adafruit_NeoPixel::getBrightness(void) const { return brightness - 1; }
void Adafruit_NeoPixel::clear(void) { memset(pixels, 0, numBytes); }

// ============================================================================
// Firmware complet, inchange (unity build).
// ============================================================================

#include "main.cpp"

// ============================================================================
// API exportee au JavaScript
// ============================================================================

extern "C" {

// Initialise le firmware ; asynchrone si setup() attend.
EMSCRIPTEN_KEEPALIVE void emu_setup(void) { setup(); }

// Un passage de loop() puis les minuteries ; asynchrone, car loop() peut attendre.
EMSCRIPTEN_KEEPALIVE void emu_tick(void) { loop(); Timer::poll(); }

// Image des LED : 512 x 3 octets dans l'ordre de la bande (GRB pour WS2812B).
EMSCRIPTEN_KEEPALIVE uint8_t* emu_pixels(void) { return strip.getPixels(); }
EMSCRIPTEN_KEEPALIVE uint32_t emu_show_count(void) { return emulatorShowCount; }
EMSCRIPTEN_KEEPALIVE int emu_pixel_order_grb(void) { return PIXEL_TYPE == WS2812B ? 1 : 0; }

// Index de bande d'un voxel (x, y, z), selon voxel_mapping.h ; -1 hors du cube.
EMSCRIPTEN_KEEPALIVE int emu_voxel_index(int x, int y, int z) {
  uint16_t index = 0;
  return tryVoxelIndex(x, y, z, &index) ? static_cast<int>(index) : -1;
}

// Depose une requete HTTP brute ; retourne 0 si une transaction est deja en cours.
EMSCRIPTEN_KEEPALIVE uint8_t* emu_request_buffer(void) { return emulatorRequest; }
EMSCRIPTEN_KEEPALIVE int emu_request_submit(int length) {
  if (emulatorRequestPending || emulatorClientOpen || length <= 0 || length > EMULATOR_REQUEST_MAX) return 0;
  emulatorRequestLength = length;
  emulatorRequestPosition = 0;
  emulatorResponseReady = false;
  emulatorResponseLength = 0;
  emulatorRequestPending = true;
  return 1;
}
EMSCRIPTEN_KEEPALIVE int emu_response_ready(void) { return emulatorResponseReady ? 1 : 0; }
EMSCRIPTEN_KEEPALIVE uint8_t* emu_response_buffer(void) { return emulatorResponse; }
EMSCRIPTEN_KEEPALIVE int emu_response_length(void) { return emulatorResponseLength; }
EMSCRIPTEN_KEEPALIVE void emu_response_consume(void) { emulatorResponseReady = false; emulatorResponseLength = 0; }

// EEPROM persistante et redemarrage.
EMSCRIPTEN_KEEPALIVE uint8_t* emu_eeprom(void) { return emulatorEeprom; }
EMSCRIPTEN_KEEPALIVE int emu_eeprom_take_dirty(void) { int dirty = emulatorEepromDirty ? 1 : 0; emulatorEepromDirty = false; return dirty; }
EMSCRIPTEN_KEEPALIVE int emu_reset_requested(void) { return emulatorResetRequested ? 1 : 0; }

}
