// ============================================================================
// EmulatorApplication - Surcouche Particle Device OS pour le Photon virtuel
// ----------------------------------------------------------------------------
// Ce fichier remplace application.h / Particle.h lorsque le firmware est compile
// avec Emscripten. Il imite uniquement l'API utilisee par le firmware L3D :
// temps, delais cooperatifs (Asyncify), GPIO factices, EEPROM en memoire,
// prise TCP virtuelle alimentee par JavaScript, Wi-Fi, cloud et systeme simules.
// Il ne contient aucune logique d'animation.
// ============================================================================

#pragma once

#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

// ---------------------------------------------------------------- types Wiring
typedef uint8_t byte;
typedef bool boolean;
typedef uint16_t pin_t;

#ifndef TRUE
#define TRUE 1
#endif
#ifndef FALSE
#define FALSE 0
#endif
#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define INPUT_PULLDOWN 3
#define AN_INPUT 4

// Broches du Photon : seules leurs valeurs comptent pour le firmware.
enum { D0 = 0, D1, D2, D3, D4, D5, D6, D7, A0 = 10, A1, A2, A3, A4, A5, A6, A7, DAC = A6, WKP = A7 };

#ifndef min
#define min(a, b) ((a) < (b) ? (a) : (b))
#endif
#ifndef max
#define max(a, b) ((a) > (b) ? (a) : (b))
#endif
#ifndef constrain
#define constrain(amt, low, high) ((amt) < (low) ? (low) : ((amt) > (high) ? (high) : (amt)))
#endif
#ifndef sq
#define sq(x) ((x) * (x))
#endif
#ifndef radians
#define radians(deg) ((deg) * 0.017453292519943295)
#endif

#define SYSTEM_MODE(mode)
#define SYSTEM_THREAD(mode)
#define STARTUP(code)
#define PRODUCT_ID(id)
#define PRODUCT_VERSION(v)
#define SINGLE_THREADED_BLOCK()
#define ATOMIC_BLOCK()

// ---------------------------------------------------------------- temps et delais
unsigned long millis(void);
unsigned long micros(void);
// Rend la main au navigateur (Asyncify) : le JavaScript peut alors injecter une requete.
void delay(unsigned long ms);
void delayMicroseconds(unsigned int us);

// ---------------------------------------------------------------- hasard et calcul
long random(long howbig);
long random(long howsmall, long howbig);
void randomSeed(unsigned int seed);
long map(long value, long fromStart, long fromEnd, long toStart, long toEnd);

// ---------------------------------------------------------------- GPIO factices
void pinMode(uint16_t pin, uint8_t mode);
void digitalWrite(uint16_t pin, uint8_t value);
int32_t digitalRead(uint16_t pin);
// Micro absent : un signal centre, donc silencieux, pour les animations audio.
int32_t analogRead(uint16_t pin);
void analogWrite(uint16_t pin, uint32_t value);

// ---------------------------------------------------------------- Serial
class EmulatorSerial {
 public:
  void begin(long) {}
  template <typename T> size_t print(T) { return 0; }
  template <typename T> size_t println(T) { return 0; }
  size_t println() { return 0; }
  int printf(const char*, ...) { return 0; }
};
extern EmulatorSerial Serial;

// ---------------------------------------------------------------- String minimale
class String {
 public:
  String() { value[0] = '\0'; }
  String(const char* text) { set(text); }
  String(int number) { snprintf(value, sizeof(value), "%d", number); }
  String(unsigned int number) { snprintf(value, sizeof(value), "%u", number); }
  String(long number) { snprintf(value, sizeof(value), "%ld", number); }
  String(unsigned long number) { snprintf(value, sizeof(value), "%lu", number); }
  String(double number, int decimals = 2) { snprintf(value, sizeof(value), "%.*f", decimals, number); }
  const char* c_str() const { return value; }
  unsigned int length() const { return static_cast<unsigned int>(strlen(value)); }
  int toInt() const { return atoi(value); }
  float toFloat() const { return static_cast<float>(atof(value)); }
  String& operator+=(const String& other) { strncat(value, other.value, sizeof(value) - strlen(value) - 1); return *this; }
  String operator+(const String& other) const { String result(*this); result += other; return result; }
  bool operator==(const char* other) const { return strcmp(value, other) == 0; }
  bool equals(const char* other) const { return strcmp(value, other) == 0; }
  void toCharArray(char* out, unsigned int size) const { if (size == 0) return; strncpy(out, value, size - 1); out[size - 1] = '\0'; }
 private:
  void set(const char* text) { strncpy(value, text != NULL ? text : "", sizeof(value) - 1); value[sizeof(value) - 1] = '\0'; }
  char value[640];
};

// ---------------------------------------------------------------- IPAddress
class IPAddress {
 public:
  IPAddress() : a(0), b(0), c(0), d(0) {}
  IPAddress(uint8_t a0, uint8_t b0, uint8_t c0, uint8_t d0) : a(a0), b(b0), c(c0), d(d0) {}
  uint8_t operator[](int i) const { return i == 0 ? a : i == 1 ? b : i == 2 ? c : d; }
  operator bool() const { return a || b || c || d; }
 private:
  uint8_t a, b, c, d;
};

// ---------------------------------------------------------------- Wi-Fi, cloud, systeme
class EmulatorWiFi {
 public:
  int8_t RSSI() { return -52; }
  bool ready() { return true; }
  IPAddress localIP() { return IPAddress(127, 0, 0, 1); }
  void on() {}
  void off() {}
  void connect() {}
};
extern EmulatorWiFi WiFi;

class EmulatorParticle {
 public:
  bool connected() { return false; }
  void process() {}
  void connect() {}
  void disconnect() {}
  void syncTime() {}
  template <typename... Args> bool publish(Args...) { return false; }
  template <typename... Args> bool function(Args...) { return true; }
  template <typename... Args> bool variable(Args...) { return true; }
  template <typename... Args> bool subscribe(Args...) { return true; }
};
extern EmulatorParticle Particle;
#define Spark Particle

#define FEATURE_RESET_INFO 1
#define FEATURE_RETAINED_MEMORY 2
enum { RESET_REASON_NONE = 0, RESET_REASON_POWER_DOWN = 20 };
enum SystemEvent { out_of_memory = 1, reset_pending = 2 };
typedef int system_event_t;

class EmulatorSystem {
 public:
  // Un redemarrage demande par le firmware relance setup() cote JavaScript.
  void reset();
  uint32_t freeMemory() { return 40000; }
  int resetReason() { return RESET_REASON_POWER_DOWN; }
  uint32_t resetReasonData() { return 0; }
  void enableFeature(int) {}
  template <typename Handler> void on(int, Handler) {}
  const char* version() { return "2.3.1-emulator"; }
};
extern EmulatorSystem System;

class EmulatorRGB {
 public:
  void control(bool) {}
  void color(int, int, int) {}
  void brightness(int) {}
};
extern EmulatorRGB RGB;

// ---------------------------------------------------------------- heure locale
class EmulatorTime {
 public:
  void zone(float hours) { offsetHours = hours; }
  int hour(); int hourFormat12(); bool isAM(); bool isPM(); int minute(); int second();
  int day(); int weekday(); int month(); int year(); long now();
 private:
  float offsetHours = 0;
};
extern EmulatorTime Time;

// ---------------------------------------------------------------- minuteries logicielles
// Les minuteries sont declenchees par la boucle de l'emulateur, entre deux passages.
class Timer {
 public:
  typedef void (*Callback)(void);
  Timer(unsigned period, Callback callback, bool oneShot = false);
  void start(); void stop(); void reset();
  void changePeriod(unsigned period) { periodMs = period; reset(); }
  bool isActive() const { return active; }
  // Appelee par l'emulateur : execute la minuterie si son echeance est passee.
  static void poll(void);
 private:
  unsigned periodMs; Callback callback; bool oneShot; bool active; unsigned long dueAt; Timer* next;
  static Timer* first;
};

// ---------------------------------------------------------------- EEPROM en memoire
#define EMULATOR_EEPROM_SIZE 2047
extern uint8_t emulatorEeprom[EMULATOR_EEPROM_SIZE];
void emulatorEepromChanged(void);
class EmulatorEEPROM {
 public:
  uint8_t read(int address) { return address >= 0 && address < EMULATOR_EEPROM_SIZE ? emulatorEeprom[address] : 0xFF; }
  void write(int address, uint8_t value) { if (address >= 0 && address < EMULATOR_EEPROM_SIZE) { emulatorEeprom[address] = value; emulatorEepromChanged(); } }
  void update(int address, uint8_t value) { write(address, value); }
  template <typename T> T& get(int address, T& value) {
    if (address >= 0 && address + static_cast<int>(sizeof(T)) <= EMULATOR_EEPROM_SIZE) memcpy(&value, emulatorEeprom + address, sizeof(T));
    return value;
  }
  template <typename T> const T& put(int address, const T& value) {
    if (address >= 0 && address + static_cast<int>(sizeof(T)) <= EMULATOR_EEPROM_SIZE) { memcpy(emulatorEeprom + address, &value, sizeof(T)); emulatorEepromChanged(); }
    return value;
  }
  size_t length() { return EMULATOR_EEPROM_SIZE; }
  void clear() { memset(emulatorEeprom, 0xFF, EMULATOR_EEPROM_SIZE); emulatorEepromChanged(); }
};
extern EmulatorEEPROM EEPROM;

// ---------------------------------------------------------------- reseau TCP virtuel
// Une seule transaction a la fois : JavaScript depose les octets d'une requete
// HTTP, le serveur du firmware les lit, ecrit sa reponse puis ferme le client.
class TCPClient {
 public:
  TCPClient() : handle(-1) {}
  explicit TCPClient(int id) : handle(id) {}
  int available();
  int read();
  int read(uint8_t* buffer, size_t size);
  size_t write(uint8_t value);
  size_t write(const uint8_t* buffer, size_t size);
  size_t write(const char* text) { return write(reinterpret_cast<const uint8_t*>(text), strlen(text)); }
  // Variante Device OS avec delai d'attente : la prise virtuelle n'attend jamais.
  size_t write(const uint8_t* buffer, size_t size, int /*timeoutMs*/) { return write(buffer, size); }
  size_t println() { return 0; }
  bool connected();
  void stop();
  void flush() {}
  int connect(const char*, uint16_t) { return 0; }
  int connect(IPAddress, uint16_t) { return 0; }
  template <typename T> size_t print(T) { return 0; }
  template <typename T> size_t println(T) { return 0; }
  operator bool() { return connected(); }
 private:
  int handle;
};

class TCPServer {
 public:
  explicit TCPServer(uint16_t port) : port(port) {}
  bool begin() { return true; }
  TCPClient available();
 private:
  uint16_t port;
};

// Attente bornee d'une condition Device OS : hors ligne, la reponse est immediate.
template <typename Condition> bool emulatorWaitFor(Condition condition, unsigned long) { return condition(); }
#define waitFor(condition, timeout) emulatorWaitFor([&]() -> bool { return condition(); }, (timeout))
#define waitUntil(condition) emulatorWaitFor([&]() -> bool { return condition(); }, 0)

// Conversion entier vers texte de la libc Arduino.
inline char* itoa(int value, char* buffer, int base) {
  if (base == 16) snprintf(buffer, 12, "%x", value); else snprintf(buffer, 12, "%d", value);
  return buffer;
}

class UDP {
 public:
  uint8_t begin(uint16_t) { return 1; }
  int parsePacket() { return 0; }
  int available() { return 0; }
  int read() { return -1; }
  int read(uint8_t*, size_t) { return 0; }
  void stop() {}
};
