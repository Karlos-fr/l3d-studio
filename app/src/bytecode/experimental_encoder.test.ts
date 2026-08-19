// ============================================================================
// ExperimentalBytecodeEncoderTests - Mesures du prototype de bytecode L3D
// ----------------------------------------------------------------------------
// Ces tests figent les tailles de phase 0 et les validations élémentaires de
// l'encodeur. Ils ne valident pas encore la semantique d'une VM definitive.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  ExperimentalOpcode,
  instruction,
  measureExperimentalProgram,
  type ExperimentalProgram,
} from "./experimental_encoder";
import { EXPERIMENTAL_PROGRAMS } from "./experimental_programs";

// Tailles totales attendues du corpus dans l'ordre publie.
const EXPECTED_TOTAL_BYTES = [50, 65, 61, 110] as const;

// ----------------------------------------------------------------------------
// Regroupe les validations de taille et de bornes de l'encodeur experimental.
// ----------------------------------------------------------------------------
function experimentalEncoderTestSuite(): void {
  // ------------------------------------------------------------------------
  // Vérifie les tailles reproductibles utilisées pour décider du stockage.
  // ------------------------------------------------------------------------
  it("mesure les quatre programmes du corpus", testExperimentalMeasurements);

  // ------------------------------------------------------------------------
  // Vérifie qu'une largeur d'instruction incohérente est refusée.
  // ------------------------------------------------------------------------
  it("refuse un nombre d'operandes incorrect", testExperimentalOperandCount);

  // ------------------------------------------------------------------------
  // Vérifie que les operandes restent representables par le format compact.
  // ------------------------------------------------------------------------
  it("refuse un operande hors octet", testExperimentalOperandRange);
}

// ----------------------------------------------------------------------------
// Controle les tailles reproductibles du corpus experimental.
// ----------------------------------------------------------------------------
function testExperimentalMeasurements(): void {
  // Mesures calculees dans l'ordre stable du corpus.
  const measurements = EXPERIMENTAL_PROGRAMS.map(measureExperimentalProgram);
  expect([
    measurements[0]?.totalBytes,
    measurements[1]?.totalBytes,
    measurements[2]?.totalBytes,
    measurements[3]?.totalBytes,
  ]).toEqual(EXPECTED_TOTAL_BYTES);
  expect([
    measurements[0]?.constantBytes,
    measurements[1]?.constantBytes,
    measurements[2]?.constantBytes,
    measurements[3]?.constantBytes,
  ]).toEqual([0, 0, 0, 0]);
}

// ----------------------------------------------------------------------------
// Fournit trop d'operandes a une instruction sans operande.
// ----------------------------------------------------------------------------
function testExperimentalOperandCount(): void {
  // Programme volontairement invalide utilise par l'assertion.
  const invalidProgram: ExperimentalProgram = {
    name: "Invalid",
    capabilities: 0,
    instructions: [instruction(ExperimentalOpcode.Clear, 1)],
  };
  expectMeasureFailure(invalidProgram, "0 operandes attendus");
}

// ----------------------------------------------------------------------------
// Fournit une valeur impossible a representer sur un octet.
// ----------------------------------------------------------------------------
function testExperimentalOperandRange(): void {
  // Programme volontairement invalide utilise par l'assertion.
  const invalidProgram: ExperimentalProgram = {
    name: "Invalid",
    capabilities: 0,
    instructions: [instruction(ExperimentalOpcode.Set, 0, 256)],
  };
  expectMeasureFailure(invalidProgram, "Operande hors octet");
}

// ----------------------------------------------------------------------------
// Verifie qu'une mesure experimentale echoue avec la cause attendue.
//
// Parametres :
// - program : programme volontairement invalide.
// - message : fragment d'erreur attendu.
// ----------------------------------------------------------------------------
function expectMeasureFailure(program: ExperimentalProgram, message: string): void {
  try {
    measureExperimentalProgram(program);
    throw new Error("La mesure aurait du echouer");
  } catch (error) {
    expect((error as Error).message).toContain(message);
  }
}

describe("encodeur bytecode experimental", experimentalEncoderTestSuite);
