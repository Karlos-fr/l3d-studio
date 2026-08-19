// ============================================================================
// BytecodeDecoder - Decodage borne des instructions L3D version 1
// ----------------------------------------------------------------------------
// Ce module transforme un payload en instructions logiques. Il ne valide pas
// le conteneur, les cibles de saut globales ni les effets sur le framebuffer.
// ============================================================================

import {
  BytecodeCapability,
  BytecodeErrorCode,
  BytecodeOpcode,
  type DecodedBytecodeInstruction,
} from "./format";

// Erreur interne enrichie avec le code public et l'offset fautif.
export class BytecodeDecodeError extends Error {
  // Code stable qui sera expose par le validateur.
  readonly code: BytecodeErrorCode;

  // Offset du premier octet de l'instruction fautive.
  readonly offset: number;

  // ------------------------------------------------------------------------
  // Cree une erreur de decodage localisee.
  //
  // Parametres :
  // - code : code public de la faute.
  // - offset : position fautive dans le payload.
  // - message : explication destinee aux tests et a l'IHM.
  // ------------------------------------------------------------------------
  constructor(code: BytecodeErrorCode, offset: number, message: string) {
    super(message);
    this.name = "BytecodeDecodeError";
    this.code = code;
    this.offset = offset;
  }
}

// ----------------------------------------------------------------------------
// Decode une instruction a un offset valide du payload.
//
// Parametres :
// - payload : suite d'instructions sans en-tete.
// - offset : position de l'opcode a decoder.
//
// Retour :
// - instruction logique avec operandes et cible eventuelle.
// --------------------------------------------------------------------------
export function decodeBytecodeInstruction(
  payload: Uint8Array,
  offset: number,
): DecodedBytecodeInstruction {
  if (offset < 0 || offset >= payload.length) {
    throw new BytecodeDecodeError(
      BytecodeErrorCode.Instruction,
      offset,
      "Offset d'instruction hors payload",
    );
  }
  // Opcode brut interprete uniquement par le switch exhaustif suivant.
  const opcode = payload[offset] as BytecodeOpcode;
  switch (opcode) {
    case BytecodeOpcode.Halt:
    case BytecodeOpcode.Clear:
    case BytecodeOpcode.Show:
    case BytecodeOpcode.Yield:
    case BytecodeOpcode.ParticleStep:
      return decoded(opcode, offset, 1, []);
    case BytecodeOpcode.Fade:
    case BytecodeOpcode.ColorWheel:
      requireBytes(payload, offset, 2);
      if (opcode === BytecodeOpcode.ColorWheel) validateSingleRegister(payload[offset + 1] ?? 0, offset);
      return decoded(opcode, offset, 2, [payload[offset + 1] ?? 0]);
    case BytecodeOpcode.SetI8:
    case BytecodeOpcode.SetU8:
    case BytecodeOpcode.AddI8:
      requireBytes(payload, offset, 3);
      validateSingleRegister(payload[offset + 1] ?? 0, offset);
      return decoded(opcode, offset, 3, [
        payload[offset + 1] ?? 0,
        opcode === BytecodeOpcode.SetU8
          ? payload[offset + 2] ?? 0
          : signedByte(payload[offset + 2] ?? 0),
      ]);
    case BytecodeOpcode.Copy:
    case BytecodeOpcode.AddReg:
    case BytecodeOpcode.SubReg:
    case BytecodeOpcode.Sin8:
      requireBytes(payload, offset, 2);
      return decoded(opcode, offset, 2, unpackPair(payload[offset + 1] ?? 0));
    case BytecodeOpcode.RandomU8:
      requireBytes(payload, offset, 4);
      validateSingleRegister(payload[offset + 1] ?? 0, offset);
      return decoded(opcode, offset, 4, [
        payload[offset + 1] ?? 0,
        payload[offset + 2] ?? 0,
        payload[offset + 3] ?? 0,
      ]);
    case BytecodeOpcode.ColorRgb:
      requireBytes(payload, offset, 4);
      return decoded(opcode, offset, 4, [
        payload[offset + 1] ?? 0,
        payload[offset + 2] ?? 0,
        payload[offset + 3] ?? 0,
      ]);
    case BytecodeOpcode.ColorRegisters:
    case BytecodeOpcode.Voxel:
      requireBytes(payload, offset, 3);
      return decoded(opcode, offset, 3, unpackTriple(
        payload[offset + 1] ?? 0,
        payload[offset + 2] ?? 0,
        offset,
      ));
    case BytecodeOpcode.Sphere:
      requireBytes(payload, offset, 4);
      return decoded(opcode, offset, 4, [
        ...unpackTriple(payload[offset + 1] ?? 0, payload[offset + 2] ?? 0, offset),
        payload[offset + 3] ?? 0,
      ]);
    case BytecodeOpcode.Bounce:
      requireBytes(payload, offset, 4);
      return decoded(opcode, offset, 4, [
        ...unpackPair(payload[offset + 1] ?? 0),
        signedByte(payload[offset + 2] ?? 0),
        signedByte(payload[offset + 3] ?? 0),
      ]);
    case BytecodeOpcode.ParticleConfigure:
      requireBytes(payload, offset, 5);
      return decoded(opcode, offset, 5, [
        payload[offset + 1] ?? 0,
        signedByte(payload[offset + 2] ?? 0),
        payload[offset + 3] ?? 0,
        payload[offset + 4] ?? 0,
      ]);
    case BytecodeOpcode.ParticleEmit:
      requireBytes(payload, offset, 4);
      return decoded(opcode, offset, 4, [
        ...unpackPair(payload[offset + 1] ?? 0),
        ...unpackPair(payload[offset + 2] ?? 0),
        ...unpackPair(payload[offset + 3] ?? 0),
      ]);
    case BytecodeOpcode.Jump: {
      requireBytes(payload, offset, 2);
      // Deplacement signe relatif a la fin de l'instruction.
      const relativeOffset = signedByte(payload[offset + 1] ?? 0);
      return decoded(opcode, offset, 2, [relativeOffset], offset + 2 + relativeOffset);
    }
    case BytecodeOpcode.JumpIfLess: {
      requireBytes(payload, offset, 3);
      // Paire des registres compares par le branchement conditionnel.
      const registers = unpackPair(payload[offset + 1] ?? 0);
      // Deplacement signe relatif a la fin de l'instruction.
      const relativeOffset = signedByte(payload[offset + 2] ?? 0);
      return decoded(
        opcode,
        offset,
        3,
        [...registers, relativeOffset],
        offset + 3 + relativeOffset,
      );
    }
    case BytecodeOpcode.Wait:
      requireBytes(payload, offset, 3);
      return decoded(opcode, offset, 3, [
        (payload[offset + 1] ?? 0) | ((payload[offset + 2] ?? 0) << 8),
      ]);
    default:
      throw new BytecodeDecodeError(
        BytecodeErrorCode.Instruction,
        offset,
        `Opcode inconnu 0x${Number(opcode).toString(16)}`,
      );
  }
}

// ----------------------------------------------------------------------------
// Retourne la capacite optionnelle exigee par un opcode.
//
// Parametres :
// - opcode : operation decodee.
//
// Retour :
// - bit de capacite, ou zero pour le coeur de la VM.
// --------------------------------------------------------------------------
export function capabilityForOpcode(opcode: BytecodeOpcode): number {
  if (opcode === BytecodeOpcode.Sphere) return BytecodeCapability.Geometry;
  if (
    opcode === BytecodeOpcode.ParticleConfigure ||
    opcode === BytecodeOpcode.ParticleEmit ||
    opcode === BytecodeOpcode.ParticleStep
  ) return BytecodeCapability.Particles;
  if (opcode === BytecodeOpcode.Sin8) return BytecodeCapability.Math8;
  return 0;
}

// ----------------------------------------------------------------------------
// Construit la representation commune d'une instruction decodee.
//
// Parametres :
// - opcode : operation reconnue.
// - offset : position de l'opcode dans le payload.
// - size : taille totale de l'instruction.
// - operands : operandes logiques deja convertis.
// - jumpTarget : cible absolue facultative d'un branchement.
//
// Retour :
// - instruction structuree partagee avec le validateur et la VM.
// --------------------------------------------------------------------------
function decoded(
  opcode: BytecodeOpcode,
  offset: number,
  size: number,
  operands: readonly number[],
  jumpTarget?: number,
): DecodedBytecodeInstruction {
  return jumpTarget === undefined
    ? { opcode, offset, size, operands }
    : { opcode, offset, size, operands, jumpTarget };
}

// ----------------------------------------------------------------------------
// Verifie qu'une instruction complete tient dans le payload.
//
// Parametres :
// - payload : suite d'octets contenant l'instruction.
// - offset : position du premier octet.
// - size : taille totale requise.
// --------------------------------------------------------------------------
function requireBytes(payload: Uint8Array, offset: number, size: number): void {
  if (offset + size > payload.length) {
    throw new BytecodeDecodeError(
      BytecodeErrorCode.Instruction,
      offset,
      "Instruction tronquee",
    );
  }
}

// ----------------------------------------------------------------------------
// Valide et retourne une paire de registres compactee.
//
// Parametres :
// - value : octet contenant deux index de quatre bits.
//
// Retour :
// - index du nibble haut puis index du nibble bas.
// --------------------------------------------------------------------------
function unpackPair(value: number): [number, number] {
  return [(value >>> 4) & 0x0f, value & 0x0f];
}

// ----------------------------------------------------------------------------
// Valide et retourne trois registres repartis sur deux octets.
//
// Parametres :
// - first : octet des deux premiers registres.
// - second : octet du troisieme registre et du nibble reserve.
// - offset : position source utilisee en cas d'erreur.
//
// Retour :
// - trois index de registres valides.
// --------------------------------------------------------------------------
function unpackTriple(first: number, second: number, offset: number): [number, number, number] {
  if ((second & 0x0f) !== 0) {
    throw new BytecodeDecodeError(
      BytecodeErrorCode.Register,
      offset,
      "Nibble reserve non nul",
    );
  }
  return [(first >>> 4) & 0x0f, first & 0x0f, (second >>> 4) & 0x0f];
}

// ----------------------------------------------------------------------------
// Valide un registre seul dont le nibble haut reste reserve.
//
// Parametres :
// - value : octet a controler.
// - offset : position source utilisee en cas d'erreur.
// --------------------------------------------------------------------------
function validateSingleRegister(value: number, offset: number): void {
  if ((value & 0xf0) !== 0) {
    throw new BytecodeDecodeError(
      BytecodeErrorCode.Register,
      offset,
      "Registre seul ou nibble reserve invalide",
    );
  }
}

// ----------------------------------------------------------------------------
// Convertit un octet en entier signe de moins 128 a 127.
//
// Parametres :
// - value : octet non signe a interpreter.
//
// Retour :
// - representation numerique signee equivalente.
// --------------------------------------------------------------------------
function signedByte(value: number): number {
  return value >= 0x80 ? value - 0x100 : value;
}
