// ============================================================================
// BytecodeDisassembler - Restitution lisible des conteneurs L3D valides
// ----------------------------------------------------------------------------
// Ce module produit un assembleur recompilable pour les tests et diagnostics.
// Il ne tente pas de reconstruire les commentaires ou noms de labels d'origine.
// ============================================================================

import {
  BYTECODE_ENTRY_POINT_OFFSET,
  BytecodeOpcode,
  type DecodedBytecodeInstruction,
} from "./format";
import { validateBytecodeContainer } from "./validator";

// ----------------------------------------------------------------------------
// Desassemble un conteneur entier apres validation complete.
//
// Parametres :
// - container : programme version 1 a rendre lisible.
//
// Retour :
// - source assembleur avec labels generes a partir des offsets.
// --------------------------------------------------------------------------
export function disassembleBytecodeContainer(container: Uint8Array): string {
  // Validation complete fournissant aussi les instructions decodees.
  const validation = validateBytecodeContainer(container);
  if (!validation.valid) {
    throw new Error(`Conteneur bytecode invalide : ${validation.errorCode}`);
  }
  // Labels generes et indexes par leur offset de payload.
  const labels = new Map<number, string>();
  // Point d'entree qui doit recevoir un label meme sans branchement.
  const entryPoint = container[BYTECODE_ENTRY_POINT_OFFSET] ?? 0;
  labels.set(entryPoint, labelForOffset(entryPoint));
  for (const instruction of validation.instructions) {
    if (instruction.jumpTarget !== undefined) {
      labels.set(instruction.jumpTarget, labelForOffset(instruction.jumpTarget));
    }
  }
  // Lignes assembleur produites dans l'ordre du payload.
  const lines: string[] = [];
  for (const instruction of validation.instructions) {
    // Label facultatif place immediatement avant son instruction.
    const label = labels.get(instruction.offset);
    if (label !== undefined) lines.push(`${label}:`);
    lines.push(formatInstruction(instruction, labels));
  }
  return `${lines.join("\n")}\n`;
}

// ----------------------------------------------------------------------------
// Formate une instruction decodee selon la syntaxe de l'assembleur.
//
// Parametres :
// - instruction : instruction logique valide.
// - labels : noms canoniques indexes par leurs offsets.
//
// Retour :
// - ligne assembleur recompilable sans son label eventuel.
// --------------------------------------------------------------------------
function formatInstruction(
  instruction: DecodedBytecodeInstruction,
  labels: ReadonlyMap<number, string>,
): string {
  // Operandes logiques reutilises dans les formats ci-dessous.
  const operands = instruction.operands;
  switch (instruction.opcode) {
    case BytecodeOpcode.Halt: return "HALT";
    case BytecodeOpcode.Clear: return "CLEAR";
    case BytecodeOpcode.Show: return "SHOW";
    case BytecodeOpcode.Yield: return "YIELD";
    case BytecodeOpcode.Fade: return `FADE ${operands[0]}`;
    case BytecodeOpcode.SetI8: return `SET_I8 ${reg(operands[0])}, ${operands[1]}`;
    case BytecodeOpcode.SetU8: return `SET_U8 ${reg(operands[0])}, ${operands[1]}`;
    case BytecodeOpcode.Copy: return twoRegisters("COPY", operands);
    case BytecodeOpcode.AddI8: return `ADD_I8 ${reg(operands[0])}, ${operands[1]}`;
    case BytecodeOpcode.AddReg: return twoRegisters("ADD_REG", operands);
    case BytecodeOpcode.SubReg: return twoRegisters("SUB_REG", operands);
    case BytecodeOpcode.Sin8: return twoRegisters("SIN8", operands);
    case BytecodeOpcode.RandomU8:
      return `RAND_U8 ${reg(operands[0])}, ${operands[1]}, ${operands[2]}`;
    case BytecodeOpcode.ColorRgb:
      return `COLOR_RGB ${operands[0]}, ${operands[1]}, ${operands[2]}`;
    case BytecodeOpcode.ColorWheel: return `COLOR_WHEEL ${reg(operands[0])}`;
    case BytecodeOpcode.ColorRegisters:
      return threeRegisters("COLOR_REGS", operands);
    case BytecodeOpcode.Voxel: return threeRegisters("VOXEL", operands);
    case BytecodeOpcode.Sphere:
      return `${threeRegisters("SPHERE", operands)}, ${operands[3]}`;
    case BytecodeOpcode.Bounce:
      return `BOUNCE ${reg(operands[0])}, ${reg(operands[1])}, ${operands[2]}, ${operands[3]}`;
    case BytecodeOpcode.ParticleConfigure:
      return `PARTICLE_CONFIG ${operands[0]}, ${operands[1]}, ${operands[2]}, ${operands[3]}`;
    case BytecodeOpcode.ParticleEmit:
      return `PARTICLE_EMIT ${reg(operands[0])}, ${reg(operands[1])}, ${reg(operands[2])}, ${reg(operands[3])}, ${reg(operands[4])}, ${reg(operands[5])}`;
    case BytecodeOpcode.ParticleStep: return "PARTICLE_STEP";
    case BytecodeOpcode.Jump:
      return `JUMP ${jumpLabel(instruction, labels)}`;
    case BytecodeOpcode.JumpIfLess:
      return `JLT ${reg(operands[0])}, ${reg(operands[1])}, ${jumpLabel(instruction, labels)}`;
    case BytecodeOpcode.Wait: return `WAIT ${operands[0]}`;
  }
}

// ----------------------------------------------------------------------------
// Retourne le nom canonique d'un registre logique.
//
// Parametres :
// - value : index de registre deja valide.
//
// Retour :
// - identifiant source R0 a R15.
// --------------------------------------------------------------------------
function reg(value: number | undefined): string {
  return `R${value ?? 0}`;
}

// ----------------------------------------------------------------------------
// Formate une instruction possedant exactement deux registres.
//
// Parametres :
// - mnemonic : nom canonique de l'instruction.
// - operands : operandes dont les deux premiers sont des registres.
//
// Retour :
// - ligne assembleur formatee.
// --------------------------------------------------------------------------
function twoRegisters(mnemonic: string, operands: readonly number[]): string {
  return `${mnemonic} ${reg(operands[0])}, ${reg(operands[1])}`;
}

// ----------------------------------------------------------------------------
// Formate une instruction possedant au moins trois registres.
//
// Parametres :
// - mnemonic : nom canonique de l'instruction.
// - operands : operandes dont les trois premiers sont des registres.
//
// Retour :
// - ligne assembleur formatee.
// --------------------------------------------------------------------------
function threeRegisters(mnemonic: string, operands: readonly number[]): string {
  return `${mnemonic} ${reg(operands[0])}, ${reg(operands[1])}, ${reg(operands[2])}`;
}

// ----------------------------------------------------------------------------
// Retourne le label valide associe a la cible d'un branchement.
//
// Parametres :
// - instruction : branchement decode avec cible absolue.
// - labels : noms generes indexes par offset.
//
// Retour :
// - label cible ou offset numerique de repli.
// --------------------------------------------------------------------------
function jumpLabel(
  instruction: DecodedBytecodeInstruction,
  labels: ReadonlyMap<number, string>,
): string {
  return labels.get(instruction.jumpTarget ?? -1) ?? String(instruction.operands.at(-1) ?? 0);
}

// ----------------------------------------------------------------------------
// Construit un label stable et triable depuis un offset de payload.
//
// Parametres :
// - offset : position absolue d'une instruction dans le payload.
//
// Retour :
// - label hexadecimal canonique.
// --------------------------------------------------------------------------
function labelForOffset(offset: number): string {
  return `L${offset.toString(16).toUpperCase().padStart(2, "0")}`;
}
