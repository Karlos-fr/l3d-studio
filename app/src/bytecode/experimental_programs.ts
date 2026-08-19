// ============================================================================
// ExperimentalBytecodePrograms - Corpus procedural de faisabilite L3D
// ----------------------------------------------------------------------------
// Ce module exprime quatre animations representatives avec des opcodes
// generiques. Il ne simule pas leur rendu et ne fige pas le futur langage.
// ============================================================================

import {
  ExperimentalOpcode,
  instruction,
  type ExperimentalProgram,
} from "./experimental_encoder";

// Capacite de base couvrant registres, controle et rendu voxel.
const CAPABILITY_CORE = 0x01;

// Capacite des primitives geometriques partagees.
const CAPABILITY_GEOMETRY = 0x02;

// Capacite du scratch de particules generique utilise par deux animations.
const CAPABILITY_PARTICLES = 0x04;

// Capacite des calculs entiers cycliques utilises par Plasma.
const CAPABILITY_MATH = 0x08;

// Programme Rain : particules descendantes, trainee, affichage et attente.
export const EXPERIMENTAL_RAIN: ExperimentalProgram = {
  name: "Rain",
  capabilities: CAPABILITY_CORE | CAPABILITY_PARTICLES,
  instructions: [
    instruction(ExperimentalOpcode.Clear),
    instruction(ExperimentalOpcode.ParticleConfigure, 10, 255, 0, 8, 1, 0),
    instruction(ExperimentalOpcode.Random, 0, 0, 7),
    instruction(ExperimentalOpcode.Set, 1, 7),
    instruction(ExperimentalOpcode.Random, 2, 0, 7),
    instruction(ExperimentalOpcode.Random, 3, 0, 255),
    instruction(ExperimentalOpcode.ParticleEmit, 0, 1, 2, 3),
    instruction(ExperimentalOpcode.ParticleStep, 0),
    instruction(ExperimentalOpcode.Fade, 224),
    instruction(ExperimentalOpcode.Show),
    instruction(ExperimentalOpcode.Wait, 150, 0),
    instruction(ExperimentalOpcode.Jump, 226),
  ],
};

// Programme Sphere : volume natif, rebonds sur trois axes et couleur cyclique.
export const EXPERIMENTAL_SPHERE: ExperimentalProgram = {
  name: "Sphere",
  capabilities: CAPABILITY_CORE | CAPABILITY_GEOMETRY,
  instructions: [
    instruction(ExperimentalOpcode.Set, 0, 3),
    instruction(ExperimentalOpcode.Set, 1, 3),
    instruction(ExperimentalOpcode.Set, 2, 3),
    instruction(ExperimentalOpcode.Set, 3, 1),
    instruction(ExperimentalOpcode.Set, 4, 1),
    instruction(ExperimentalOpcode.Set, 5, 0),
    instruction(ExperimentalOpcode.Set, 6, 0),
    instruction(ExperimentalOpcode.Clear),
    instruction(ExperimentalOpcode.ColorWheel, 6),
    instruction(ExperimentalOpcode.Sphere, 0, 1, 2, 2),
    instruction(ExperimentalOpcode.Show),
    instruction(ExperimentalOpcode.Wait, 100, 0),
    instruction(ExperimentalOpcode.Bounce, 0, 3, 2, 5),
    instruction(ExperimentalOpcode.Bounce, 1, 4, 2, 5),
    instruction(ExperimentalOpcode.Bounce, 2, 5, 2, 5),
    instruction(ExperimentalOpcode.Add, 6, 5),
    instruction(ExperimentalOpcode.Jump, 227),
  ],
};

// Programme Fireworks : le même moteur de particules est configuré en explosion.
export const EXPERIMENTAL_FIREWORKS: ExperimentalProgram = {
  name: "Fireworks",
  capabilities: CAPABILITY_CORE | CAPABILITY_PARTICLES,
  instructions: [
    instruction(ExperimentalOpcode.Clear),
    instruction(ExperimentalOpcode.ParticleConfigure, 40, 254, 240, 20, 2, 1),
    instruction(ExperimentalOpcode.Random, 0, 2, 5),
    instruction(ExperimentalOpcode.Random, 1, 3, 6),
    instruction(ExperimentalOpcode.Random, 2, 2, 5),
    instruction(ExperimentalOpcode.Random, 3, 0, 255),
    instruction(ExperimentalOpcode.Set, 5, 1),
    instruction(ExperimentalOpcode.ParticleEmit, 0, 1, 2, 3),
    instruction(ExperimentalOpcode.ParticleStep, 4),
    instruction(ExperimentalOpcode.Fade, 232),
    instruction(ExperimentalOpcode.Show),
    instruction(ExperimentalOpcode.Wait, 50, 0),
    instruction(ExperimentalOpcode.JumpIfLess, 4, 5, 243),
    instruction(ExperimentalOpcode.Wait, 200, 1),
    instruction(ExperimentalOpcode.Jump, 225),
  ],
};

// Programme Plasma : trois boucles coordonnees calculent une couleur entière.
export const EXPERIMENTAL_PLASMA: ExperimentalProgram = {
  name: "Plasma",
  capabilities: CAPABILITY_CORE | CAPABILITY_MATH,
  instructions: [
    instruction(ExperimentalOpcode.Set, 0, 0),
    instruction(ExperimentalOpcode.Set, 1, 0),
    instruction(ExperimentalOpcode.Set, 2, 0),
    instruction(ExperimentalOpcode.Set, 3, 0),
    instruction(ExperimentalOpcode.Set, 4, 0),
    instruction(ExperimentalOpcode.Set, 5, 0),
    instruction(ExperimentalOpcode.Set, 12, 8),
    instruction(ExperimentalOpcode.Copy, 6, 0),
    instruction(ExperimentalOpcode.Add, 6, 3),
    instruction(ExperimentalOpcode.Sin8, 7, 6),
    instruction(ExperimentalOpcode.Copy, 8, 1),
    instruction(ExperimentalOpcode.Add, 8, 4),
    instruction(ExperimentalOpcode.Sin8, 9, 8),
    instruction(ExperimentalOpcode.Copy, 10, 2),
    instruction(ExperimentalOpcode.Add, 10, 5),
    instruction(ExperimentalOpcode.Sin8, 11, 10),
    instruction(ExperimentalOpcode.ColorRegisters, 7, 9, 11),
    instruction(ExperimentalOpcode.Voxel, 0, 1, 2),
    instruction(ExperimentalOpcode.Add, 2, 1),
    instruction(ExperimentalOpcode.JumpIfLess, 2, 12, 222),
    instruction(ExperimentalOpcode.Set, 2, 0),
    instruction(ExperimentalOpcode.Add, 1, 1),
    instruction(ExperimentalOpcode.JumpIfLess, 1, 12, 213),
    instruction(ExperimentalOpcode.Set, 1, 0),
    instruction(ExperimentalOpcode.Add, 0, 1),
    instruction(ExperimentalOpcode.JumpIfLess, 0, 12, 204),
    instruction(ExperimentalOpcode.Show),
    instruction(ExperimentalOpcode.Wait, 50, 0),
    instruction(ExperimentalOpcode.Add, 3, 3),
    instruction(ExperimentalOpcode.Add, 4, 5),
    instruction(ExperimentalOpcode.Add, 5, 7),
    instruction(ExperimentalOpcode.Jump, 181),
  ],
};

// Corpus complet utilise par les tests et le rapport de taille de phase 0.
export const EXPERIMENTAL_PROGRAMS: readonly ExperimentalProgram[] = [
  EXPERIMENTAL_RAIN,
  EXPERIMENTAL_SPHERE,
  EXPERIMENTAL_FIREWORKS,
  EXPERIMENTAL_PLASMA,
];
