// ============================================================================
// BytecodeValidatorTest - Rejet des conteneurs L3D invalides
// ----------------------------------------------------------------------------
// Ces tests corrompent des conteneurs assembles pour verifier les frontieres de
// securite avant execution. Ils ne couvrent ni le DOM ni le stockage EEPROM.
// ============================================================================

import { describe, expect, it } from "vitest";
import { assembleBytecodeSource } from "./assembler";
import { calculateBytecodeCrc, writeBytecodeUint16 } from "./crc16";
import {
  BYTECODE_CAPABILITIES_OFFSET,
  BYTECODE_CRC_OFFSET,
  BYTECODE_ENTRY_POINT_OFFSET,
  BYTECODE_HEADER_SIZE,
  BytecodeErrorCode,
} from "./format";
import { validateBytecodeContainer } from "./validator";

// ----------------------------------------------------------------------------
// Execute la suite de tests du validateur.
// ----------------------------------------------------------------------------
function validatorTestSuite(): void {
  // --------------------------------------------------------------------------
  // Verifie le rejet d'un conteneur coupe avant sa longueur annoncee.
  // --------------------------------------------------------------------------
  it("refuse un programme tronque", testTruncatedProgram);

  // --------------------------------------------------------------------------
  // Verifie le rejet d'un opcode inconnu malgre un CRC coherent.
  // --------------------------------------------------------------------------
  it("refuse un opcode inconnu", testUnknownOpcode);

  // --------------------------------------------------------------------------
  // Verifie qu'un branchement cible obligatoirement une frontiere.
  // --------------------------------------------------------------------------
  it("refuse un saut au milieu d'une instruction", testJumpBoundary);

  // --------------------------------------------------------------------------
  // Verifie que les nibbles reserves doivent rester nuls.
  // --------------------------------------------------------------------------
  it("refuse un encodage de registre non canonique", testReservedRegisterNibble);

  // --------------------------------------------------------------------------
  // Verifie plusieurs bornes d'operandes independantes de l'etat runtime.
  // --------------------------------------------------------------------------
  it("refuse les valeurs statiques hors plage", testStaticValues);

  // --------------------------------------------------------------------------
  // Verifie l'annonce des capacites et le point d'entree.
  // --------------------------------------------------------------------------
  it("refuse capacite ou entree incoherente", testHeaderContracts);
}

// ----------------------------------------------------------------------------
// Retire le dernier octet d'un conteneur pourtant annonce plus long.
// ----------------------------------------------------------------------------
function testTruncatedProgram(): void {
  // Conteneur valide avant troncature.
  const container = assembleBytecodeSource("WAIT 10\nHALT\n").container;
  // Vue tronquee qui conserve la longueur annoncee dans son en-tete.
  const truncated = container.slice(0, -1);

  expect(validateBytecodeContainer(truncated).errorCode).toBe(BytecodeErrorCode.Length);
}

// ----------------------------------------------------------------------------
// Injecte un opcode inconnu puis restaure un CRC valide.
// ----------------------------------------------------------------------------
function testUnknownOpcode(): void {
  // Conteneur minimal a corrompre.
  const container = assembleBytecodeSource("HALT\n").container.slice();
  container[BYTECODE_HEADER_SIZE] = 0xff;
  refreshCrc(container);

  expect(validateBytecodeContainer(container).errorCode).toBe(BytecodeErrorCode.Instruction);
}

// ----------------------------------------------------------------------------
// Remplace la cible d'un saut par l'operande d'une instruction SET_U8.
// ----------------------------------------------------------------------------
function testJumpBoundary(): void {
  // Le payload commence par JUMP puis SET_U8 puis HALT.
  const container = assembleBytecodeSource(
    "JUMP end\nSET_U8 R0, 1\nend:\nHALT\n",
  ).container.slice();
  // Offset relatif +1 : cible absolue 3, au milieu de SET_U8 situe a 2.
  container[BYTECODE_HEADER_SIZE + 1] = 1;
  refreshCrc(container);

  expect(validateBytecodeContainer(container).errorCode).toBe(BytecodeErrorCode.Jump);
}

// ----------------------------------------------------------------------------
// Rend non nul le nibble reserve du troisieme registre VOXEL.
// ----------------------------------------------------------------------------
function testReservedRegisterNibble(): void {
  // Conteneur contenant une instruction a trois registres.
  const container = assembleBytecodeSource("VOXEL R1, R2, R3\nHALT\n").container.slice();
  container[BYTECODE_HEADER_SIZE + 2] |= 0x01;
  refreshCrc(container);

  expect(validateBytecodeContainer(container).errorCode).toBe(BytecodeErrorCode.Register);
}

// ----------------------------------------------------------------------------
// Assemble des valeurs encodables mais semantiquement interdites.
// ----------------------------------------------------------------------------
function testStaticValues(): void {
  // RAND dont la borne minimale depasse la borne maximale.
  const random = assembleBytecodeSource("RAND_U8 R0, 0, 9\nHALT\n").container.slice();
  random[BYTECODE_HEADER_SIZE + 2] = 10;
  refreshCrc(random);
  // Configuration qui demande zero particule.
  const particles = assembleBytecodeSource(
    "PARTICLE_CONFIG 1, 0, 255, 1\nHALT\n",
  ).container.slice();
  particles[BYTECODE_HEADER_SIZE + 1] = 0;
  refreshCrc(particles);

  expect(validateBytecodeContainer(random).errorCode).toBe(BytecodeErrorCode.Value);
  expect(validateBytecodeContainer(particles).errorCode).toBe(BytecodeErrorCode.ParticleLimit);
}

// ----------------------------------------------------------------------------
// Corrompt separement capacites et point d'entree avec des CRC recalcules.
// ----------------------------------------------------------------------------
function testHeaderContracts(): void {
  // Programme qui exige explicitement la capacite geometrique.
  const missingCapability = assembleBytecodeSource(
    "SET_U8 R0, 1\nSPHERE R0, R0, R0, 1\nHALT\n",
  ).container.slice();
  missingCapability[BYTECODE_CAPABILITIES_OFFSET] = 0;
  refreshCrc(missingCapability);

  // Programme dont l'entree est deplacee dans un operande SET_U8.
  const invalidEntry = assembleBytecodeSource("SET_U8 R0, 1\nHALT\n").container.slice();
  invalidEntry[BYTECODE_ENTRY_POINT_OFFSET] = 1;
  refreshCrc(invalidEntry);

  expect(validateBytecodeContainer(missingCapability).errorCode)
    .toBe(BytecodeErrorCode.Capability);
  expect(validateBytecodeContainer(invalidEntry).errorCode)
    .toBe(BytecodeErrorCode.EntryPoint);
}

// ----------------------------------------------------------------------------
// Recalcule le CRC apres une mutation volontaire du test.
//
// Parametres :
// - container : conteneur mutable dont le champ CRC sera remplace.
//
// Effet de bord :
// - modifie les deux octets CRC du conteneur fourni.
// ----------------------------------------------------------------------------
function refreshCrc(container: Uint8Array): void {
  writeBytecodeUint16(container, BYTECODE_CRC_OFFSET, calculateBytecodeCrc(container));
}

describe("validateur bytecode L3D", validatorTestSuite);
