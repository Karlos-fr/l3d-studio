// ============================================================================
// BytecodeValidator - Validation complete des conteneurs L3D version 1
// ----------------------------------------------------------------------------
// Ce module controle en-tete, CRC, instructions et branchements avant toute
// execution. Il ne modifie aucun framebuffer et ne corrige jamais un programme.
// ============================================================================

import { calculateBytecodeCrc, readBytecodeUint16 } from "./crc16";
import {
  BytecodeDecodeError,
  capabilityForOpcode,
  decodeBytecodeInstruction,
} from "./decoder";
import {
  BYTECODE_CAPABILITIES_OFFSET,
  BYTECODE_CRC_OFFSET,
  BYTECODE_ENTRY_POINT_OFFSET,
  BYTECODE_FLAGS_OFFSET,
  BYTECODE_FORMAT_VERSION,
  BYTECODE_FORMAT_VERSION_OFFSET,
  BYTECODE_HEADER_SIZE,
  BYTECODE_KNOWN_CAPABILITIES,
  BYTECODE_MAGIC,
  BYTECODE_PARTICLE_LIMIT,
  BYTECODE_PAYLOAD_LENGTH_OFFSET,
  BYTECODE_PAYLOAD_MAX_SIZE,
  BYTECODE_VM_VERSION,
  BYTECODE_VM_VERSION_OFFSET,
  BYTECODE_WAIT_MAX_MS,
  BytecodeErrorCode,
  BytecodeOpcode,
  type BytecodeValidationResult,
  type DecodedBytecodeInstruction,
} from "./format";

// ----------------------------------------------------------------------------
// Valide un conteneur sans produire d'effet de bord.
//
// Parametres :
// - container : conteneur complet en-tete puis payload.
// - vmVersion : version de VM disponible, un par defaut.
//
// Retour :
// - succes avec instructions decodees ou premiere faute stable.
// --------------------------------------------------------------------------
export function validateBytecodeContainer(
  container: Uint8Array,
  vmVersion = BYTECODE_VM_VERSION,
): BytecodeValidationResult {
  if (container.length < BYTECODE_HEADER_SIZE + 1 || !hasBytecodeMagic(container)) {
    return failure(BytecodeErrorCode.Container);
  }
  if (container[BYTECODE_FORMAT_VERSION_OFFSET] !== BYTECODE_FORMAT_VERSION) {
    return failure(BytecodeErrorCode.FormatVersion);
  }
  if ((container[BYTECODE_VM_VERSION_OFFSET] ?? 0) > vmVersion) {
    return failure(BytecodeErrorCode.VmVersion);
  }
  // Longueur de payload annoncee dans l'en-tete.
  const payloadLength = container[BYTECODE_PAYLOAD_LENGTH_OFFSET] ?? 0;
  if (
    payloadLength < 1 ||
    payloadLength > BYTECODE_PAYLOAD_MAX_SIZE ||
    container.length !== BYTECODE_HEADER_SIZE + payloadLength
  ) {
    return failure(BytecodeErrorCode.Length);
  }
  // Capacites optionnelles annoncees par le producteur.
  const capabilities = container[BYTECODE_CAPABILITIES_OFFSET] ?? 0;
  if ((capabilities & ~BYTECODE_KNOWN_CAPABILITIES) !== 0) {
    return failure(BytecodeErrorCode.Capability);
  }
  if ((container[BYTECODE_FLAGS_OFFSET] ?? 0) !== 0) {
    return failure(BytecodeErrorCode.Container);
  }
  if (readBytecodeUint16(container, BYTECODE_CRC_OFFSET) !== calculateBytecodeCrc(container)) {
    return failure(BytecodeErrorCode.Crc);
  }
  // Copie isolee des instructions sans leur en-tete.
  const payload = container.slice(BYTECODE_HEADER_SIZE);
  // Prefixe d'instructions decodees dans l'ordre.
  const instructions: DecodedBytecodeInstruction[] = [];
  // Ensemble des offsets autorises pour entrees et sauts.
  const boundaries = new Set<number>();
  let requiredCapabilities = 0;
  let offset = 0;
  try {
    while (offset < payload.length) {
      boundaries.add(offset);
      // Instruction complete commençant a l'offset courant.
      const instruction = decodeBytecodeInstruction(payload, offset);
      // Faute detectable sans connaitre les registres runtime.
      const staticError = validateStaticOperands(instruction);
      if (staticError !== undefined) return failure(staticError, offset, instructions);
      instructions.push(instruction);
      requiredCapabilities |= capabilityForOpcode(instruction.opcode);
      offset += instruction.size;
    }
  } catch (error) {
    if (error instanceof BytecodeDecodeError) {
      return failure(error.code, error.offset, instructions);
    }
    throw error;
  }
  if (offset !== payload.length) return failure(BytecodeErrorCode.Instruction, offset, instructions);
  if ((capabilities & requiredCapabilities) !== requiredCapabilities) {
    return failure(BytecodeErrorCode.Capability, undefined, instructions);
  }
  // Point d'entree relatif au debut du payload.
  const entryPoint = container[BYTECODE_ENTRY_POINT_OFFSET] ?? 0;
  if (!boundaries.has(entryPoint)) {
    return failure(BytecodeErrorCode.EntryPoint, entryPoint, instructions);
  }
  for (const instruction of instructions) {
    if (instruction.jumpTarget !== undefined && !boundaries.has(instruction.jumpTarget)) {
      return failure(BytecodeErrorCode.Jump, instruction.offset, instructions);
    }
  }
  return { valid: true, instructions };
}

// ----------------------------------------------------------------------------
// Indique si le conteneur commence exactement par la signature L3D.
//
// Parametres :
// - container : octets commençant potentiellement par la signature.
//
// Retour :
// - vrai lorsque les trois octets L3D sont presents dans l'ordre.
// --------------------------------------------------------------------------
function hasBytecodeMagic(container: Uint8Array): boolean {
  return (
    container[0] === BYTECODE_MAGIC[0] &&
    container[1] === BYTECODE_MAGIC[1] &&
    container[2] === BYTECODE_MAGIC[2]
  );
}

// ----------------------------------------------------------------------------
// Valide les operandes dont les bornes sont connues avant l'execution.
//
// Parametres :
// - instruction : instruction decodee a controler.
//
// Retour :
// - code de faute statique ou absence d'erreur.
// --------------------------------------------------------------------------
function validateStaticOperands(
  instruction: DecodedBytecodeInstruction,
): BytecodeErrorCode | undefined {
  // Operandes logiques deja valides structurellement.
  const operands = instruction.operands;
  switch (instruction.opcode) {
    case BytecodeOpcode.RandomU8:
      return (operands[1] ?? 0) <= (operands[2] ?? 0)
        ? undefined
        : BytecodeErrorCode.Value;
    case BytecodeOpcode.Sphere: {
      // Rayon immediat borne par le contrat geometrique.
      const radius = operands[3] ?? 0;
      return radius >= 1 && radius <= 7 ? undefined : BytecodeErrorCode.Value;
    }
    case BytecodeOpcode.Bounce:
      return (operands[2] ?? 0) <= (operands[3] ?? 0)
        ? undefined
        : BytecodeErrorCode.Value;
    case BytecodeOpcode.ParticleConfigure: {
      // Capacite active demandee au moteur fixe.
      const count = operands[0] ?? 0;
      // Duree initiale exigee strictement positive.
      const life = operands[3] ?? 0;
      return count >= 1 && count <= BYTECODE_PARTICLE_LIMIT && life >= 1
        ? undefined
        : BytecodeErrorCode.ParticleLimit;
    }
    case BytecodeOpcode.Wait:
      return (operands[0] ?? 0) <= BYTECODE_WAIT_MAX_MS
        ? undefined
        : BytecodeErrorCode.Value;
    default:
      return undefined;
  }
}

// ----------------------------------------------------------------------------
// Construit un resultat d'echec uniforme sans perdre les instructions deja lues.
//
// Parametres :
// - errorCode : code stable de la premiere faute.
// - errorOffset : offset fautif facultatif.
// - instructions : prefixe deja decode sans faute.
//
// Retour :
// - resultat de validation invalide structure.
// --------------------------------------------------------------------------
function failure(
  errorCode: BytecodeErrorCode,
  errorOffset?: number,
  instructions: readonly DecodedBytecodeInstruction[] = [],
): BytecodeValidationResult {
  return errorOffset === undefined
    ? { valid: false, errorCode, instructions }
    : { valid: false, errorCode, errorOffset, instructions };
}
