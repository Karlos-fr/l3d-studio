// ============================================================================
// BytecodeCrc16 - Controle d'integrite des conteneurs L3D
// ----------------------------------------------------------------------------
// Ce module calcule le CRC-16/CCITT-FALSE contractuel. Il ignore la signature
// et le champ CRC, et ne connait ni le stockage EEPROM ni le transport LAN.
// ============================================================================

import {
  BYTECODE_FLAGS_OFFSET,
  BYTECODE_FORMAT_VERSION_OFFSET,
  BYTECODE_HEADER_SIZE,
} from "./format";

// Valeur initiale du CRC-16/CCITT-FALSE.
const CRC16_INITIAL_VALUE = 0xffff;

// Polynome non reflechi du CRC-16/CCITT-FALSE.
const CRC16_POLYNOMIAL = 0x1021;

// Masque conservant chaque etape sur seize bits.
const CRC16_MASK = 0xffff;

// ----------------------------------------------------------------------------
// Calcule le CRC contractuel d'un conteneur deja dimensionne.
//
// Parametres :
// - container : en-tete et payload dont le champ CRC peut encore etre nul.
//
// Retour :
// - CRC-16 couvrant les champs 3 a 9 puis le payload.
// --------------------------------------------------------------------------
export function calculateBytecodeCrc(container: Uint8Array): number {
  let crc = CRC16_INITIAL_VALUE;
  for (
    let offset = BYTECODE_FORMAT_VERSION_OFFSET;
    offset <= BYTECODE_FLAGS_OFFSET;
    offset += 1
  ) {
    crc = updateBytecodeCrc(crc, container[offset] ?? 0);
  }
  for (let offset = BYTECODE_HEADER_SIZE; offset < container.length; offset += 1) {
    crc = updateBytecodeCrc(crc, container[offset] ?? 0);
  }
  return crc;
}

// ----------------------------------------------------------------------------
// Ecrit un entier seize bits little-endian dans un conteneur.
//
// Parametres :
// - destination : buffer deja dimensionne.
// - offset : position du premier octet.
// - value : valeur non signee sur seize bits.
//
// Effet de bord :
// - remplace exactement deux octets de destination.
// --------------------------------------------------------------------------
export function writeBytecodeUint16(
  destination: Uint8Array,
  offset: number,
  value: number,
): void {
  destination[offset] = value & 0xff;
  destination[offset + 1] = (value >>> 8) & 0xff;
}

// ----------------------------------------------------------------------------
// Lit un entier seize bits little-endian depuis un conteneur.
//
// Parametres :
// - source : buffer contenant deux octets accessibles.
// - offset : position du premier octet.
//
// Retour :
// - entier non signe sur seize bits.
// --------------------------------------------------------------------------
export function readBytecodeUint16(source: Uint8Array, offset: number): number {
  return (source[offset] ?? 0) | ((source[offset + 1] ?? 0) << 8);
}

// ----------------------------------------------------------------------------
// Integre un octet supplementaire dans un CRC en cours.
//
// Parametres :
// - current : CRC calcule avant l'octet.
// - value : octet a integrer.
//
// Retour :
// - nouvelle valeur du CRC sur seize bits.
// --------------------------------------------------------------------------
function updateBytecodeCrc(current: number, value: number): number {
  let crc = current ^ (value << 8);
  for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
    crc = (crc & 0x8000) !== 0
      ? ((crc << 1) ^ CRC16_POLYNOMIAL) & CRC16_MASK
      : (crc << 1) & CRC16_MASK;
  }
  return crc;
}
