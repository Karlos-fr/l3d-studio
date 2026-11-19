// ============================================================================
// EmulatorSmoke - Verification de bout en bout du Photon virtuel sous Node
// ----------------------------------------------------------------------------
// Demarre le firmware WebAssembly, fait tourner sa boucle, interroge l'API LAN
// par la prise TCP virtuelle, change de mode et controle que les LED changent.
// Usage : node test/smoke.mjs (apres .\build.ps1)
// ============================================================================

import createL3dEmulator from '../dist/l3d-emulator.mjs';

const emulator = await createL3dEmulator();
const setup = emulator.cwrap('emu_setup', null, [], { async: true });
const tick = emulator.cwrap('emu_tick', null, [], { async: true });
const pixelsPointer = emulator._emu_pixels();
let failures = 0;

function check(label, condition, detail = '') {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}${detail ? ` - ${detail}` : ''}`);
  if (!condition) failures += 1;
}

// Le firmware tourne en continu : un passage de loop() peut durer toute une animation,
// et le reseau est servi pendant ses attentes cooperatives, comme sur le Photon.
let ticks = 0;
let running = true;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Comme Device OS entre deux loop() : on rend la main au moins toutes les 8 ms, sinon un
// mode sans delay() (Stream, Off) affamerait le reste du programme.
async function runner() {
  let lastYield = performance.now();
  while (running) {
    await tick();
    ticks += 1;
    if (performance.now() - lastYield > 8) { await sleep(0); lastYield = performance.now(); }
  }
}
async function run(ms) { await sleep(ms); }

// Envoie une requete HTTP brute et fait tourner le firmware jusqu'a la reponse.
async function http(method, path, body = '', contentType = 'text/plain') {
  const bodyBytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const head = `${method} /api/v1${path} HTTP/1.1\r\nHost: cube.local\r\n`
    + (method === 'POST' ? `Content-Type: ${contentType}\r\nContent-Length: ${bodyBytes.length}\r\n` : '')
    + 'Connection: close\r\n\r\n';
  const request = new Uint8Array([...new TextEncoder().encode(head), ...bodyBytes]);
  emulator.HEAPU8.set(request, emulator._emu_request_buffer());
  if (!emulator._emu_request_submit(request.length)) throw new Error('prise occupee');
  const started = performance.now();
  while (!emulator._emu_response_ready()) {
    if (performance.now() - started > 4000) throw new Error(`pas de reponse pour ${method} ${path}`);
    await sleep(5);
  }
  const pointer = emulator._emu_response_buffer();
  const text = new TextDecoder().decode(emulator.HEAPU8.slice(pointer, pointer + emulator._emu_response_length()));
  emulator._emu_response_consume();
  const [status, ...rest] = text.split('\r\n');
  return { status, body: text.slice(text.indexOf('\r\n\r\n') + 4), raw: rest };
}

function litPixels() {
  const pixels = emulator.HEAPU8.subarray(pixelsPointer, pixelsPointer + 512 * 3);
  let lit = 0;
  for (let i = 0; i < 512; i += 1) if (pixels[i * 3] || pixels[i * 3 + 1] || pixels[i * 3 + 2]) lit += 1;
  return lit;
}
function snapshot() { return emulator.HEAPU8.slice(pixelsPointer, pixelsPointer + 512 * 3); }

await setup();
check('setup() se termine', true);
void runner();

const showsBefore = emulator._emu_show_count();
await run(3000);
const shows = emulator._emu_show_count() - showsBefore;
check('le firmware rafraichit les LED', shows > 10, `${shows} appels a show() en 3 s (${(shows / 3).toFixed(0)} img/s), ${litPixels()} LED allumees, ${ticks} passages de loop()`);

const health = await http('GET', '/health');
check('GET /health repond 200', health.status.includes('200'), health.status);
console.log(health.body.trim().split('\n').map((line) => `       ${line}`).join('\n'));

const state = await http('GET', '/state');
check('GET /state repond 200', state.status.includes('200'), `${state.body.length} octets`);
console.log(state.body.trim().split('\n').slice(0, 8).map((line) => `       ${line}`).join('\n'));

const modes = await http('GET', '/modes');
check('GET /modes repond 200', modes.status.includes('200'), `${modes.body.split('\n').length} lignes`);

const colorAll = await http('POST', '/mode', 'M:ColorAll,S:4,B:1,C1:0000FF,');
check('POST /mode ColorAll bleu', colorAll.status.includes('200'), colorAll.body.trim().replace(/\n/g, ' '));
await run(800);
const blue = snapshot();
let blueOnly = 0;
for (let i = 0; i < 512; i += 1) if (blue[i * 3 + 2] > 0 && blue[i * 3] === 0 && blue[i * 3 + 1] === 0) blueOnly += 1;
check('les 512 LED passent au bleu', blueOnly === 512, `${blueOnly} LED bleues`);

// Frame de streaming : passe en mode Stream puis envoie 512 octets RGB332.
const streamMode = await http('POST', '/mode', 'M:Stream,');
check('POST /mode Stream', streamMode.status.includes('200'), streamMode.body.trim().replace(/\n/g, ' '));
await run(200);
const frame = new Uint8Array(512);
frame[0] = 0xE0; // voxel (0,0,0) rouge vif, ordre z puis y puis x
frame[511] = 0x1C; // voxel (7,7,7) vert vif
const streamed = await http('POST', '/stream/frame', frame, 'application/octet-stream');
check('POST /stream/frame', streamed.status.includes('200'), streamed.status);
await run(200);
const red = emulator._emu_voxel_index(0, 0, 0);
const green = emulator._emu_voxel_index(7, 7, 7);
const after = snapshot();
check('le voxel (0,0,0) est rouge', after[red * 3 + 1] > 0 && after[red * 3] === 0, `GRB = ${after[red * 3]},${after[red * 3 + 1]},${after[red * 3 + 2]}`);
check('le voxel (7,7,7) est vert', after[green * 3] > 0 && after[green * 3 + 1] === 0, `GRB = ${after[green * 3]},${after[green * 3 + 1]},${after[green * 3 + 2]}`);

running = false;
console.log(failures === 0 ? '\nPhoton virtuel : tout est vert.' : `\n${failures} verification(s) en echec.`);
process.exit(failures === 0 ? 0 : 1);
