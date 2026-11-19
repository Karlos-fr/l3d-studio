# ============================================================================
# BuildEmulator - Compile le firmware L3D en Photon virtuel WebAssembly
# ----------------------------------------------------------------------------
# Produit dist/l3d-emulator.mjs et dist/l3d-emulator.wasm (module ES chargeable
# par un navigateur, un Worker ou Node). Le firmware n'est pas modifie : la
# surcouche include/ remplace Device OS et emulator.cpp l'inclut en unity build.
# Usage : .\build.ps1 [-Emsdk D:\emsdk] [-Debug]
# ============================================================================
param(
  [string]$Emsdk = $(if ($env:EMSDK) { $env:EMSDK } else { 'D:\emsdk' }),
  [switch]$Debug
)
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force dist | Out-Null

$emcc = Join-Path $Emsdk 'upstream\emscripten\em++.exe'
if (-not (Test-Path $emcc)) { throw "em++ introuvable : $emcc" }

$exports = @(
  'emu_setup', 'emu_tick', 'emu_pixels', 'emu_show_count', 'emu_pixel_order_grb', 'emu_voxel_index',
  'emu_request_buffer', 'emu_request_submit', 'emu_response_ready', 'emu_response_buffer',
  'emu_response_length', 'emu_response_consume', 'emu_eeprom', 'emu_eeprom_take_dirty',
  'emu_reset_requested', 'malloc', 'free'
) | ForEach-Object { "_$_" }

$arguments = @(
  'emulator.cpp', '-I', 'include', '-I', '..\src', '-std=gnu++17',
  $(if ($Debug) { '-O0' } else { '-O2' }), '-g0', '-w', '-Wno-c++11-narrowing',
  # Asyncify : delay() suspend la pile C++ et rend la main au navigateur.
  '-sASYNCIFY', '-sASYNCIFY_STACK_SIZE=65536',
  '-sMODULARIZE', '-sEXPORT_ES6', '-sEXPORT_NAME=createL3dEmulator',
  '-sENVIRONMENT=web,worker,node', '-sALLOW_MEMORY_GROWTH',
  ('-sEXPORTED_FUNCTIONS=' + ($exports -join ',')),
  '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAPU8',
  '-o', 'dist\l3d-emulator.mjs'
)
& $emcc @arguments
if ($LASTEXITCODE -ne 0) { throw "La compilation a echoue ($LASTEXITCODE)." }
Get-ChildItem dist | ForEach-Object { '{0,-24} {1,10:N0} octets' -f $_.Name, $_.Length }
