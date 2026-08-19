// ============================================================================
// BytecodeReferenceVmTest - Execution deterministe de la VM L3D TypeScript
// ----------------------------------------------------------------------------
// Ces tests valident rendu, attente, quotas et corpus procedural. Ils restent
// independants du DOM, du firmware et du transport reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import { assembleBytecodeSource } from "./assembler";
import { BYTECODE_REFERENCE_PROGRAMS } from "./reference_programs";
import { BytecodeReferenceVm } from "./reference_vm";
import { BytecodeErrorCode, BytecodeOpcode } from "./format";

// Offset RGB du voxel x=1, y=2, z=3 dans le framebuffer logique.
const TEST_VOXEL_OFFSET = ((3 * 64) + (2 * 8) + 1) * 3;

// Nombre maximal de tranches accorde au Plasma avant sa premiere frame.
const CORPUS_RUN_LIMIT = 256;

// Source qui execute chaque famille d'opcodes avant une frontiere SHOW.
const OPCODE_EXECUTION_SOURCE = `
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
SHOW
YIELD
WAIT 1
HALT
`;

// ----------------------------------------------------------------------------
// Execute la suite de tests de la VM de reference.
// ----------------------------------------------------------------------------
function referenceVmTestSuite(): void {
  // --------------------------------------------------------------------------
  // Verifie l'ecriture RGB888 d'un voxel logique.
  // --------------------------------------------------------------------------
  it("dessine un voxel avec la couleur courante", testVoxelRendering);

  // --------------------------------------------------------------------------
  // Verifie l'execution de chaque famille d'opcodes non branchee.
  // --------------------------------------------------------------------------
  it("execute les opcodes version 1", testOpcodeExecution);

  // --------------------------------------------------------------------------
  // Verifie les deux formes de branchement relatif.
  // --------------------------------------------------------------------------
  it("execute les branchements relatifs", testRelativeBranches);

  // --------------------------------------------------------------------------
  // Verifie que WAIT suspend sans bloquer l'appelant.
  // --------------------------------------------------------------------------
  it("reprend apres une attente non bloquante", testWaitBoundary);

  // --------------------------------------------------------------------------
  // Verifie l'arret d'une boucle qui ne coopere jamais.
  // --------------------------------------------------------------------------
  it("interrompt une boucle au quota cooperatif", testCooperativeQuota);

  // --------------------------------------------------------------------------
  // Verifie la reproductibilite du generateur pseudo-aleatoire.
  // --------------------------------------------------------------------------
  it("produit une trace aleatoire deterministe", testDeterministicRandom);

  // --------------------------------------------------------------------------
  // Verifie l'assemblage et l'execution du corpus procedural.
  // --------------------------------------------------------------------------
  it("execute Rain, sphere, Fireworks et Plasma", testReferenceCorpus);
}

// ----------------------------------------------------------------------------
// Execute un programme qui dessine un voxel puis atteint SHOW.
// ----------------------------------------------------------------------------
function testVoxelRendering(): void {
  // Source minimale de rendu RGB888.
  const source = `
SET_U8 R0, 1
SET_U8 R1, 2
SET_U8 R2, 3
COLOR_RGB 10, 20, 30
VOXEL R0, R1, R2
SHOW
`;
  // VM construite depuis le conteneur valide.
  const vm = new BytecodeReferenceVm(assembleBytecodeSource(source).container);
  // Resultat de la premiere tranche, arretee par SHOW.
  const result = vm.run(0);

  expect(result.state).toBe("yielded");
  expect(Array.from(vm.framebuffer.slice(TEST_VOXEL_OFFSET, TEST_VOXEL_OFFSET + 3)))
    .toEqual([10, 20, 30]);
  expect(vm.getShownFrameCount()).toBe(1);
}

// ----------------------------------------------------------------------------
// Execute toutes les instructions sequentielles et controle leur trace.
// ----------------------------------------------------------------------------
function testOpcodeExecution(): void {
  // VM qui atteint successivement SHOW, YIELD, WAIT puis HALT.
  const vm = new BytecodeReferenceVm(
    assembleBytecodeSource(OPCODE_EXECUTION_SOURCE).container,
    99,
  );

  expect(vm.run(0).state).toBe("yielded");
  expect(vm.run(0).state).toBe("yielded");
  expect(vm.run(0).state).toBe("waiting");
  expect(vm.run(1).state).toBe("halted");

  // Ensemble des opcodes reellement executes dans la session.
  const executedOpcodes = new Set(vm.trace.map(traceOpcode));
  expect(executedOpcodes.has(BytecodeOpcode.ParticleStep)).toBe(true);
  expect(executedOpcodes.has(BytecodeOpcode.Sphere)).toBe(true);
  expect(executedOpcodes.has(BytecodeOpcode.Halt)).toBe(true);
  expect(executedOpcodes.has(BytecodeOpcode.Wait)).toBe(true);
}

// ----------------------------------------------------------------------------
// Retourne l'opcode d'une entree de trace.
//
// Parametres :
// - entry : entree de trace produite par la VM.
//
// Retour :
// - opcode execute.
// ----------------------------------------------------------------------------
function traceOpcode(entry: { opcode: BytecodeOpcode }): BytecodeOpcode {
  return entry.opcode;
}

// ----------------------------------------------------------------------------
// Controle JLT pris puis JUMP inconditionnel vers une frontiere HALT.
// ----------------------------------------------------------------------------
function testRelativeBranches(): void {
  // Programme dont les deux branchements doivent etre pris.
  const source = `
SET_U8 R0, 0
SET_U8 R1, 1
JLT R0, R1, less
SET_U8 R2, 99
less:
JUMP end
SET_U8 R2, 88
end:
HALT
`;
  // VM de controle des cibles relatives.
  const vm = new BytecodeReferenceVm(assembleBytecodeSource(source).container);

  expect(vm.run(0).state).toBe("halted");
  expect(vm.registers[2]).toBe(0);
}

// ----------------------------------------------------------------------------
// Controle l'echeance uint32 d'une instruction WAIT.
// ----------------------------------------------------------------------------
function testWaitBoundary(): void {
  // VM dont le programme attend dix millisecondes avant HALT.
  const vm = new BytecodeReferenceVm(
    assembleBytecodeSource("WAIT 10\nHALT\n").container,
  );

  expect(vm.run(100).state).toBe("waiting");
  expect(vm.run(109).state).toBe("waiting");
  expect(vm.run(110).state).toBe("halted");
}

// ----------------------------------------------------------------------------
// Execute une boucle infinie sans WAIT, YIELD ni SHOW.
// ----------------------------------------------------------------------------
function testCooperativeQuota(): void {
  // VM volontairement non cooperative.
  const vm = new BytecodeReferenceVm(
    assembleBytecodeSource("loop:\nJUMP loop\n").container,
  );
  // Dernier resultat observe apres plusieurs tranches automatiques.
  let result = vm.run(0);

  for (let slice = 0; slice < 5 && result.state !== "fault"; slice += 1) {
    result = vm.run(0);
  }
  expect(result.state).toBe("fault");
  expect(result.errorCode).toBe(BytecodeErrorCode.Quota);
}

// ----------------------------------------------------------------------------
// Compare deux traces obtenues avec la meme graine explicite.
// ----------------------------------------------------------------------------
function testDeterministicRandom(): void {
  // Programme tirant deux valeurs avant de rendre la main.
  const program = assembleBytecodeSource(
    "RAND_U8 R0, 0, 255\nRAND_U8 R1, 0, 255\nYIELD\n",
  );
  // Premiere VM de reference.
  const first = new BytecodeReferenceVm(program.container, 1234);
  // Seconde VM initialisee avec la meme graine.
  const second = new BytecodeReferenceVm(program.container, 1234);

  first.run(0);
  second.run(0);
  expect(second.trace).toEqual(first.trace);
}

// ----------------------------------------------------------------------------
// Assemble chaque source `.l3d` et attend sa premiere frame sans faute.
// ----------------------------------------------------------------------------
function testReferenceCorpus(): void {
  for (const referenceProgram of BYTECODE_REFERENCE_PROGRAMS) {
    // Resultat d'assemblage de l'animation courante.
    const program = assembleBytecodeSource(referenceProgram.source);
    // VM isolee de l'animation courante.
    const vm = new BytecodeReferenceVm(program.container, 42);
    // Nombre de tranches utilisees pour atteindre la premiere frame.
    const sliceCount = runUntilFirstFrame(vm);

    expect(program.payload.length, referenceProgram.id).toBeLessThanOrEqual(185);
    expect(sliceCount, referenceProgram.id).toBeLessThan(CORPUS_RUN_LIMIT);
    expect(vm.getShownFrameCount(), referenceProgram.id).toBeGreaterThan(0);
  }
}

// ----------------------------------------------------------------------------
// Execute une VM jusqu'a SHOW, HALT, faute ou epuisement de la borne de test.
//
// Parametres :
// - vm : machine virtuelle deja initialisee.
//
// Retour :
// - nombre de tranches executees.
// ----------------------------------------------------------------------------
function runUntilFirstFrame(vm: BytecodeReferenceVm): number {
  for (let slice = 1; slice <= CORPUS_RUN_LIMIT; slice += 1) {
    // Horodatage croissant qui libere tous les WAIT de 50 ms.
    const now = slice * 50;
    // Etat atteint par la tranche courante.
    const result = vm.run(now);
    if (result.state === "fault") {
      throw new Error(`Faute VM inattendue ${result.errorCode}`);
    }
    if (vm.getShownFrameCount() > 0 || result.state === "halted") return slice;
  }
  return CORPUS_RUN_LIMIT;
}

describe("VM bytecode L3D de reference", referenceVmTestSuite);
