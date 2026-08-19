// ============================================================================
// BytecodeReferencePrograms - Corpus assembleur procedural de reference
// ----------------------------------------------------------------------------
// Ce module expose les sources `.l3d` aux tests et a la future interface. Il
// ne les assemble pas et ne depend ni du DOM ni du transport vers le Photon.
// ============================================================================

import fireworksSource from "./examples/fireworks.l3d?raw";
import plasmaSource from "./examples/plasma.l3d?raw";
import rainSource from "./examples/rain.l3d?raw";
import sphereSource from "./examples/sphere.l3d?raw";

// Description minimale d'une animation assembleur du corpus.
export interface BytecodeReferenceProgram {
  id: string;
  source: string;
}

// Corpus procedural utilise pour valider la version 1 du langage.
export const BYTECODE_REFERENCE_PROGRAMS: readonly BytecodeReferenceProgram[] = [
  { id: "rain", source: rainSource },
  { id: "sphere", source: sphereSource },
  { id: "fireworks", source: fireworksSource },
  { id: "plasma", source: plasmaSource },
];
