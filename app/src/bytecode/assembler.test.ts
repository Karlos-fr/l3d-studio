// ============================================================================
// BytecodeAssemblerTest - Contrats de l'assembleur et du desassembleur L3D
// ----------------------------------------------------------------------------
// Ces tests couvrent la syntaxe, l'encodage compact et la reproductibilite. Ils
// n'executent pas la VM et n'utilisent ni DOM ni reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import { assembleBytecodeSource, BytecodeAssemblyError } from "./assembler";
import { disassembleBytecodeContainer } from "./disassembler";
import {
  BYTECODE_HEADER_SIZE,
  BYTECODE_PAYLOAD_MAX_SIZE,
  BytecodeOpcode,
} from "./format";
import { validateBytecodeContainer } from "./validator";

// Source compacte qui contient chaque opcode version 1 au moins une fois.
const ALL_OPCODES_SOURCE = `
start:
CLEAR
SET_I8 R0, -1
SET_U8 R1, 1
COPY R2, R1
ADD_I8 R2, 1
ADD_REG R2, R1
SUB_REG R2, R1
SIN8 R3, R2
RAND_U8 R4, 0, 7
COLOR_RGB 1, 2, 3
COLOR_WHEEL R4
COLOR_REGS R1, R2, R3
VOXEL R1, R1, R1
SPHERE R1, R1, R1, 1
BOUNCE R1, R2, 0, 7
PARTICLE_CONFIG 1, -1, 255, 2
PARTICLE_EMIT R1, R1, R1, R0, R0, R0
PARTICLE_STEP
FADE 200
JLT R0, R1, branch
JUMP branch
branch:
SHOW
YIELD
WAIT 1
HALT
`;

// ----------------------------------------------------------------------------
// Execute la suite de tests de l'assembleur.
// ----------------------------------------------------------------------------
function assemblerTestSuite(): void {
  // --------------------------------------------------------------------------
  // Verifie la reproductibilite et la presence de tous les opcodes.
  // --------------------------------------------------------------------------
  it("assemble tous les opcodes de facon reproductible", testAllOpcodes);

  // --------------------------------------------------------------------------
  // Verifie l'encodage des registres dans des nibbles.
  // --------------------------------------------------------------------------
  it("compacte les registres dans leurs nibbles", testPackedRegisters);

  // --------------------------------------------------------------------------
  // Verifie qu'un desassemblage peut etre assemble a l'identique.
  // --------------------------------------------------------------------------
  it("desassemble un programme recompilable", testDisassemblyRoundTrip);

  // --------------------------------------------------------------------------
  // Verifie la localisation des erreurs utilisateur.
  // --------------------------------------------------------------------------
  it("indique la ligne et la cause des sources invalides", testSourceErrors);

  // --------------------------------------------------------------------------
  // Verifie la limite contractuelle du payload.
  // --------------------------------------------------------------------------
  it("refuse un payload superieur a la banque", testPayloadLimit);
}

// ----------------------------------------------------------------------------
// Assemble deux fois la meme source et controle les opcodes decodes.
// ----------------------------------------------------------------------------
function testAllOpcodes(): void {
  // Premier assemblage servant de reference binaire.
  const first = assembleBytecodeSource(ALL_OPCODES_SOURCE, { generation: 7 });
  // Second assemblage devant etre strictement identique.
  const second = assembleBytecodeSource(ALL_OPCODES_SOURCE, { generation: 7 });
  // Validation et decodage du conteneur de reference.
  const validation = validateBytecodeContainer(first.container);
  // Ensemble des opcodes effectivement presents dans le payload.
  const actualOpcodes = new Set(validation.instructions.map(opcodeOfInstruction));
  // Ensemble contractuel des opcodes enumeres en version 1.
  const expectedOpcodes = new Set(
    Object.values(BytecodeOpcode).filter(isNumericOpcode),
  );

  expect(second.container).toEqual(first.container);
  expect(validation.valid).toBe(true);
  expect(actualOpcodes).toEqual(expectedOpcodes);
}

// ----------------------------------------------------------------------------
// Retourne l'opcode d'une instruction pour construire un ensemble de test.
//
// Parametres :
// - instruction : instruction decodee par le validateur.
//
// Retour :
// - opcode numerique de l'instruction.
// ----------------------------------------------------------------------------
function opcodeOfInstruction(instruction: { opcode: BytecodeOpcode }): BytecodeOpcode {
  return instruction.opcode;
}

// ----------------------------------------------------------------------------
// Indique si une valeur d'enum correspond a son membre numerique.
//
// Parametres :
// - value : valeur issue de l'enum TypeScript.
//
// Retour :
// - vrai uniquement pour un opcode numerique.
// ----------------------------------------------------------------------------
function isNumericOpcode(value: string | BytecodeOpcode): value is BytecodeOpcode {
  return typeof value === "number";
}

// ----------------------------------------------------------------------------
// Controle les octets de registres d'une instruction VOXEL.
// ----------------------------------------------------------------------------
function testPackedRegisters(): void {
  // Programme minimal dont les registres ont des nibbles distincts.
  const program = assembleBytecodeSource("VOXEL R1, R2, R3\nHALT\n");

  expect(Array.from(program.payload)).toEqual([BytecodeOpcode.Voxel, 0x12, 0x30, 0x00]);
}

// ----------------------------------------------------------------------------
// Compare le conteneur initial au conteneur regenere depuis le desassemblage.
// ----------------------------------------------------------------------------
function testDisassemblyRoundTrip(): void {
  // Programme source couvrant labels et plusieurs formes d'operandes.
  const initial = assembleBytecodeSource(ALL_OPCODES_SOURCE);
  // Source canonique produite depuis le conteneur valide.
  const disassembled = disassembleBytecodeContainer(initial.container);
  // Programme reconstruit depuis la source canonique.
  const rebuilt = assembleBytecodeSource(disassembled);

  expect(rebuilt.container).toEqual(initial.container);
}

// ----------------------------------------------------------------------------
// Controle plusieurs erreurs de syntaxe et leur numero de ligne.
// ----------------------------------------------------------------------------
function testSourceErrors(): void {
  expectAssemblyError("CLEAR\nINCONNU\n", 2, "Mnemonique inconnu");
  expectAssemblyError("SET_U8 R16, 1\n", 1, "Registre invalide");
  expectAssemblyError("WAIT 60001\n", 1, "WAIT hors plage");
  expectAssemblyError("JUMP absent\n", 1, "Label inconnu");
  expectAssemblyError("RAND_U8 R0, 10, 9\n", 1, "Bornes RAND_U8 inversees");
  expectAssemblyError("SPHERE R0, R1, R2, 0\n", 1, "Rayon SPHERE hors plage");
  expectAssemblyError("PARTICLE_CONFIG 0, 0, 255, 1\n", 1, "particules hors plage");
}

// ----------------------------------------------------------------------------
// Controle une erreur d'assemblage attendue sans masquer sa cause.
//
// Parametres :
// - source : source volontairement invalide.
// - lineNumber : ligne qui doit etre signalee.
// - messagePart : fragment attendu dans le message.
// ----------------------------------------------------------------------------
function expectAssemblyError(source: string, lineNumber: number, messagePart: string): void {
  try {
    assembleBytecodeSource(source);
    throw new Error("L'assemblage aurait du echouer");
  } catch (error) {
    expect(error).toBeInstanceOf(BytecodeAssemblyError);
    expect((error as BytecodeAssemblyError).lineNumber).toBe(lineNumber);
    expect((error as Error).message).toContain(messagePart);
  }
}

// ----------------------------------------------------------------------------
// Construit assez d'instructions pour depasser les 185 octets autorises.
// ----------------------------------------------------------------------------
function testPayloadLimit(): void {
  // Nombre de CLEAR necessaires pour franchir la limite d'un octet.
  const instructionCount = BYTECODE_PAYLOAD_MAX_SIZE + 1;
  // Source trop grande constituee uniquement d'instructions valides.
  const source = `${"CLEAR\n".repeat(instructionCount)}HALT\n`;

  expectAssemblyError(source, instructionCount, "Payload superieur");
  expect(BYTECODE_HEADER_SIZE + BYTECODE_PAYLOAD_MAX_SIZE).toBe(197);
}

describe("assembleur bytecode L3D", assemblerTestSuite);
