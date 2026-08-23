// ============================================================================
// BytecodeFormat - Contrat binaire version 1 des animations procedurales L3D
// ----------------------------------------------------------------------------
// Ce module partage les constantes du conteneur entre assembleur, validateur et
// VM TypeScript. Il ne parse aucune source et ne connait pas l'interface.
// ============================================================================

// Taille totale de l'en-tete persistant version 1.
export const BYTECODE_HEADER_SIZE = 12;

// Taille maximale d'une banque EEPROM transactionnelle.
export const BYTECODE_CONTAINER_MAX_SIZE = 197;

// Taille maximale du payload d'instructions.
export const BYTECODE_PAYLOAD_MAX_SIZE = 185;

// Version du format binaire prise en charge.
export const BYTECODE_FORMAT_VERSION = 1;

// Version de la VM TypeScript de reference.
export const BYTECODE_VM_VERSION = 1;

// Nombre fixe de registres signes de seize bits.
export const BYTECODE_REGISTER_COUNT = 16;

// Nombre maximal d'instructions executees par tranche.
export const BYTECODE_SLICE_INSTRUCTION_LIMIT = 64;

// Nombre maximal d'instructions sans frontiere cooperative.
export const BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT = 256;

// Nombre maximal de particules actives.
export const BYTECODE_PARTICLE_LIMIT = 32;

// Duree maximale acceptee par WAIT.
export const BYTECODE_WAIT_MAX_MS = 60_000;

// Signature ASCII L3D du conteneur valide.
export const BYTECODE_MAGIC = [0x4c, 0x33, 0x44] as const;

// Offset de la version de format dans l'en-tete.
export const BYTECODE_FORMAT_VERSION_OFFSET = 3;

// Offset de la version minimale de VM.
export const BYTECODE_VM_VERSION_OFFSET = 4;

// Offset du masque de capacites.
export const BYTECODE_CAPABILITIES_OFFSET = 5;

// Offset de la generation transactionnelle.
export const BYTECODE_GENERATION_OFFSET = 6;

// Offset de la longueur du payload.
export const BYTECODE_PAYLOAD_LENGTH_OFFSET = 7;

// Offset du point d'entree relatif au payload.
export const BYTECODE_ENTRY_POINT_OFFSET = 8;

// Offset des drapeaux reserves.
export const BYTECODE_FLAGS_OFFSET = 9;

// Offset du CRC-16 little-endian.
export const BYTECODE_CRC_OFFSET = 10;

// Masque de toutes les capacites connues par la version 1.
export const BYTECODE_KNOWN_CAPABILITIES = 0x07;

// Capacites optionnelles annoncees dans le conteneur.
export enum BytecodeCapability {
  // Autorise les primitives geometriques comme SPHERE.
  Geometry = 0x01,
  // Autorise le moteur borne de particules.
  Particles = 0x02,
  // Autorise les fonctions mathematiques cycliques sur huit bits.
  Math8 = 0x04,
}

// Opcodes stables de la VM version 1.
export enum BytecodeOpcode {
  // Termine normalement le programme courant.
  Halt = 0x00,
  // Efface le framebuffer logique.
  Clear = 0x01,
  // Demande l'affichage et constitue une frontiere cooperative.
  Show = 0x02,
  // Rend volontairement la main sans afficher.
  Yield = 0x03,
  // Attenue chaque composante du framebuffer.
  Fade = 0x04,
  // Charge un immediat signe dans un registre.
  SetI8 = 0x10,
  // Charge un immediat non signe dans un registre.
  SetU8 = 0x11,
  // Copie un registre dans un autre.
  Copy = 0x12,
  // Ajoute un immediat signe avec rebouclage int16.
  AddI8 = 0x13,
  // Ajoute deux registres avec rebouclage int16.
  AddReg = 0x14,
  // Soustrait deux registres avec rebouclage int16.
  SubReg = 0x15,
  // Calcule un sinus cyclique non signe sur huit bits.
  Sin8 = 0x16,
  // Tire un entier uniforme dans une plage non signee.
  RandomU8 = 0x17,
  // Remplace la couleur courante par trois immediats RGB888.
  ColorRgb = 0x20,
  // Choisit la couleur depuis une phase de roue.
  ColorWheel = 0x21,
  // Lit les trois composantes de couleur dans des registres.
  ColorRegisters = 0x22,
  // Dessine un voxel avec la couleur courante.
  Voxel = 0x30,
  // Dessine une sphere pleine avec la couleur courante.
  Sphere = 0x31,
  // Avance une position et inverse sa vitesse aux bornes.
  Bounce = 0x32,
  // Configure la capacite fixe du moteur de particules.
  ParticleConfigure = 0x38,
  // Emet une particule depuis six registres.
  ParticleEmit = 0x39,
  // Avance et dessine les particules actives.
  ParticleStep = 0x3a,
  // Applique un branchement relatif inconditionnel.
  Jump = 0x40,
  // Branche lorsque le premier registre est inferieur au second.
  JumpIfLess = 0x41,
  // Suspend sans bloquer jusqu'a une echeance.
  Wait = 0x50,
}

// Codes d'erreur publics partages avec le futur firmware.
export enum BytecodeErrorCode {
  // En-tete ou signature de conteneur invalide.
  Container = -300,
  // Version de format non prise en charge.
  FormatVersion = -301,
  // Version minimale de VM indisponible.
  VmVersion = -302,
  // Longueur annoncee ou physique incoherente.
  Length = -303,
  // Controle CRC invalide.
  Crc = -304,
  // Capacite inconnue ou requise mais absente.
  Capability = -305,
  // Opcode inconnu ou instruction tronquee.
  Instruction = -306,
  // Cible de branchement hors frontiere.
  Jump = -307,
  // Point d'entree hors frontiere.
  EntryPoint = -308,
  // Registre ou nibble reserve invalide.
  Register = -309,
  // Coordonnee runtime hors du cube.
  Coordinate = -310,
  // Operande ou resultat runtime interdit.
  Value = -311,
  // Quota cooperatif depasse.
  Quota = -312,
  // Capacite de particules invalide.
  ParticleLimit = -313,
  // Aucun programme installable disponible.
  NoProgram = -314,
  // Etat VM incompatible avec l'instruction.
  State = -315,
  // Ecriture ou relecture EEPROM incoherente.
  Storage = -316,
}

// Instruction decodee avec operandes logiques et taille binaire.
export interface DecodedBytecodeInstruction {
  opcode: BytecodeOpcode;
  offset: number;
  size: number;
  operands: readonly number[];
  jumpTarget?: number;
}

// Resultat structure de la validation complete d'un conteneur.
export interface BytecodeValidationResult {
  valid: boolean;
  errorCode?: BytecodeErrorCode;
  errorOffset?: number;
  instructions: readonly DecodedBytecodeInstruction[];
}

// Resultat produit par l'assembleur textuel.
export interface AssembledBytecodeProgram {
  container: Uint8Array;
  payload: Uint8Array;
  capabilities: number;
  entryPoint: number;
  generation: number;
}
