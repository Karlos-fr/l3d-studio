// ============================================================================
// ExperimentalBytecodeEncoder - Encodeur de faisabilite du bytecode L3D
// ----------------------------------------------------------------------------
// Ce module mesure un premier encodage compact pour la phase 0. Son format
// reste experimental et ne constitue pas encore le contrat de la VM firmware.
// ============================================================================

// Taille fixe de l'en-tete experimental, CRC inclus.
export const EXPERIMENTAL_HEADER_BYTES = 12;

// Version zero reservee aux mesures de faisabilite non installables.
const EXPERIMENTAL_FORMAT_VERSION = 0;

// Signature ASCII L3D placee au debut du conteneur experimental.
const EXPERIMENTAL_MAGIC = [0x4c, 0x33, 0x44] as const;

// Valeur initiale du CRC-16/CCITT utilise pour rendre les mesures realistes.
const CRC16_INITIAL_VALUE = 0xffff;

// Polynome du CRC-16/CCITT applique octet par octet.
const CRC16_POLYNOMIAL = 0x1021;

// Masque conservant les calculs CRC dans seize bits.
const UINT16_MASK = 0xffff;

// Nombre maximal representable par un operande experimental d'un octet.
const UINT8_MAX = 0xff;

// Opcodes generiques suffisants pour le corpus de faisabilite.
export enum ExperimentalOpcode {
  // Efface le framebuffer logique.
  Clear = 0x01,
  // Affiche la frame logique courante.
  Show = 0x02,
  // Charge une constante signee compacte dans un registre.
  Set = 0x10,
  // Copie un registre vers un autre.
  Copy = 0x11,
  // Ajoute une constante signee a un registre.
  Add = 0x12,
  // Calcule un sinus entier cyclique sur huit bits.
  Sin8 = 0x15,
  // Tire une valeur aleatoire bornee dans un registre.
  Random = 0x16,
  // Definit la couleur depuis un index de roue chromatique en registre.
  ColorWheel = 0x21,
  // Definit la couleur depuis trois registres de composantes.
  ColorRegisters = 0x22,
  // Dessine un voxel dont les coordonnees proviennent de registres.
  Voxel = 0x30,
  // Dessine une sphere depuis trois registres de centre et un rayon immediat.
  Sphere = 0x31,
  // Attenue toutes les couleurs selon un facteur entier.
  Fade = 0x33,
  // Avance une position et inverse sa vitesse aux limites.
  Bounce = 0x34,
  // Configure le scratch de particules generique.
  ParticleConfigure = 0x35,
  // Emet une particule depuis des registres de position et de couleur.
  ParticleEmit = 0x36,
  // Avance et dessine toutes les particules actives.
  ParticleStep = 0x37,
  // Effectue un saut relatif signe.
  Jump = 0x40,
  // Saute lorsque le premier registre est inferieur au second.
  JumpIfLess = 0x41,
  // Affiche puis suspend la VM pendant une duree bornee.
  Wait = 0x50,
}

// Nombre exact d'operandes attendu pour chaque opcode experimental.
const EXPERIMENTAL_OPERAND_COUNTS: Readonly<Record<ExperimentalOpcode, number>> = {
  [ExperimentalOpcode.Clear]: 0,
  [ExperimentalOpcode.Show]: 0,
  [ExperimentalOpcode.Set]: 2,
  [ExperimentalOpcode.Copy]: 2,
  [ExperimentalOpcode.Add]: 2,
  [ExperimentalOpcode.Sin8]: 2,
  [ExperimentalOpcode.Random]: 3,
  [ExperimentalOpcode.ColorWheel]: 1,
  [ExperimentalOpcode.ColorRegisters]: 3,
  [ExperimentalOpcode.Voxel]: 3,
  [ExperimentalOpcode.Sphere]: 4,
  [ExperimentalOpcode.Fade]: 1,
  [ExperimentalOpcode.Bounce]: 4,
  [ExperimentalOpcode.ParticleConfigure]: 6,
  [ExperimentalOpcode.ParticleEmit]: 4,
  [ExperimentalOpcode.ParticleStep]: 1,
  [ExperimentalOpcode.Jump]: 1,
  [ExperimentalOpcode.JumpIfLess]: 3,
  [ExperimentalOpcode.Wait]: 2,
};

// Instruction intermediaire deja resolue, sans label ni dependance a l'IHM.
export interface ExperimentalInstruction {
  opcode: ExperimentalOpcode;
  operands: readonly number[];
}

// Programme procedural utilise uniquement pour les mesures de phase 0.
export interface ExperimentalProgram {
  name: string;
  capabilities: number;
  instructions: readonly ExperimentalInstruction[];
}

// Resultat detaille permettant de separer en-tete, code et constantes.
export interface ExperimentalProgramMeasurement {
  name: string;
  headerBytes: number;
  instructionBytes: number;
  constantBytes: number;
  totalBytes: number;
  instructionCount: number;
  container: Uint8Array;
}

// --------------------------------------------------------------------------
// Construit une instruction experimentale sans masquer ses operandes.
//
// Parametres :
// - opcode : operation generique a encoder.
// - operands : valeurs d'un octet attendues par l'operation.
//
// Retour :
// - instruction intermediaire immutable utilisable dans le corpus.
// --------------------------------------------------------------------------
export function instruction(
  opcode: ExperimentalOpcode,
  ...operands: number[]
): ExperimentalInstruction {
  return { opcode, operands };
}

// --------------------------------------------------------------------------
// Encode un programme et retourne sa repartition exacte en octets.
//
// Parametres :
// - program : programme experimental deja assemble.
//
// Retour :
// - conteneur binaire et mesures separees de ses composants.
// --------------------------------------------------------------------------
export function measureExperimentalProgram(
  program: ExperimentalProgram,
): ExperimentalProgramMeasurement {
  // Instructions compactes validees du programme experimental.
  const code = encodeInstructions(program.instructions);
  // Conteneur final dimensionne exactement autour du code.
  const container = new Uint8Array(EXPERIMENTAL_HEADER_BYTES + code.length);
  container.set(EXPERIMENTAL_MAGIC, 0);
  container[3] = EXPERIMENTAL_FORMAT_VERSION;
  writeUint16(container, 4, program.capabilities);
  writeUint16(container, 6, code.length);
  container[8] = 0;
  container[9] = 0;
  container.set(code, EXPERIMENTAL_HEADER_BYTES);
  writeUint16(container, 10, calculateCrc16(code));
  return {
    name: program.name,
    headerBytes: EXPERIMENTAL_HEADER_BYTES,
    instructionBytes: code.length,
    constantBytes: 0,
    totalBytes: container.length,
    instructionCount: program.instructions.length,
    container,
  };
}

// --------------------------------------------------------------------------
// Encode une liste d'instructions apres validation de leurs largeurs.
//
// Parametres :
// - instructions : operations deja resolues a serialiser.
//
// Retour :
// - suite compacte opcode puis operandes.
// --------------------------------------------------------------------------
function encodeInstructions(
  instructions: readonly ExperimentalInstruction[],
): Uint8Array {
  // Octets accumules avant conversion vers un tableau borne.
  const bytes: number[] = [];
  for (const currentInstruction of instructions) {
    // Largeur d'operandes imposee par l'opcode experimental.
    const expectedCount = EXPERIMENTAL_OPERAND_COUNTS[currentInstruction.opcode];
    if (currentInstruction.operands.length !== expectedCount) {
      throw new Error(
        `Opcode ${currentInstruction.opcode} : ${expectedCount} operandes attendus`,
      );
    }
    bytes.push(currentInstruction.opcode);
    for (const operand of currentInstruction.operands) {
      if (!Number.isInteger(operand) || operand < 0 || operand > UINT8_MAX) {
        throw new Error(`Operande hors octet : ${operand}`);
      }
      bytes.push(operand);
    }
  }
  return Uint8Array.from(bytes);
}

// --------------------------------------------------------------------------
// Calcule un CRC-16/CCITT sur le code experimental.
//
// Parametres :
// - bytes : octets d'instructions a proteger.
//
// Retour :
// - CRC non reflechi sur seize bits.
// --------------------------------------------------------------------------
function calculateCrc16(bytes: Uint8Array): number {
  let crc = CRC16_INITIAL_VALUE;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      crc = (crc & 0x8000) !== 0
        ? ((crc << 1) ^ CRC16_POLYNOMIAL) & UINT16_MASK
        : (crc << 1) & UINT16_MASK;
    }
  }
  return crc;
}

// --------------------------------------------------------------------------
// Ecrit un entier seize bits en little-endian dans un buffer borne.
//
// Parametres :
// - destination : conteneur experimental deja dimensionne.
// - offset : position du premier octet.
// - value : valeur non signee a encoder.
//
// Effet de bord :
// - remplace exactement deux octets du conteneur.
// --------------------------------------------------------------------------
function writeUint16(destination: Uint8Array, offset: number, value: number): void {
  destination[offset] = value & UINT8_MAX;
  destination[offset + 1] = (value >>> 8) & UINT8_MAX;
}
