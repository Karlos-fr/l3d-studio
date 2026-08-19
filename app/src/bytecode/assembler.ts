// ============================================================================
// BytecodeAssembler - Assemblage en deux passes des sources textuelles L3D
// ----------------------------------------------------------------------------
// Ce module transforme une syntaxe proche du bytecode en conteneur version 1.
// Il ne simule pas les instructions et ne connait ni le DOM ni le transport.
// ============================================================================

import { calculateBytecodeCrc, writeBytecodeUint16 } from "./crc16";
import { capabilityForOpcode } from "./decoder";
import {
  BYTECODE_CAPABILITIES_OFFSET,
  BYTECODE_CONTAINER_MAX_SIZE,
  BYTECODE_CRC_OFFSET,
  BYTECODE_ENTRY_POINT_OFFSET,
  BYTECODE_FLAGS_OFFSET,
  BYTECODE_FORMAT_VERSION,
  BYTECODE_FORMAT_VERSION_OFFSET,
  BYTECODE_GENERATION_OFFSET,
  BYTECODE_HEADER_SIZE,
  BYTECODE_MAGIC,
  BYTECODE_PAYLOAD_LENGTH_OFFSET,
  BYTECODE_PAYLOAD_MAX_SIZE,
  BYTECODE_VM_VERSION,
  BYTECODE_VM_VERSION_OFFSET,
  BytecodeOpcode,
  type AssembledBytecodeProgram,
} from "./format";

// Options facultatives du conteneur produit.
export interface BytecodeAssemblyOptions {
  generation?: number;
  entryLabel?: string;
}

// Instruction source localisee et adressee apres la premiere passe.
interface SourceStatement {
  lineNumber: number;
  address: number;
  mnemonic: string;
  operands: readonly string[];
}

// Resultat de la premiere passe avec labels et taille finale.
interface ParsedAssemblySource {
  statements: readonly SourceStatement[];
  labels: ReadonlyMap<string, number>;
  payloadLength: number;
}

// Tailles binaires exactes des mnemonniques version 1.
const INSTRUCTION_SIZES: Readonly<Record<string, number>> = {
  HALT: 1,
  CLEAR: 1,
  SHOW: 1,
  YIELD: 1,
  FADE: 2,
  SET_I8: 3,
  SET_U8: 3,
  COPY: 2,
  ADD_I8: 3,
  ADD_REG: 2,
  SUB_REG: 2,
  SIN8: 2,
  RAND_U8: 4,
  COLOR_RGB: 4,
  COLOR_WHEEL: 2,
  COLOR_REGS: 3,
  VOXEL: 3,
  SPHERE: 4,
  BOUNCE: 4,
  PARTICLE_CONFIG: 5,
  PARTICLE_EMIT: 4,
  PARTICLE_STEP: 1,
  JUMP: 2,
  JLT: 3,
  WAIT: 3,
};

// Erreur d'assemblage avec la ligne source destinee a l'IHM.
export class BytecodeAssemblyError extends Error {
  // Numero de ligne un-indexe ou zero pour une option globale.
  readonly lineNumber: number;

  // ------------------------------------------------------------------------
  // Cree une erreur source localisee et lisible.
  //
  // Parametres :
  // - lineNumber : ligne fautive, ou zero hors instruction.
  // - message : cause concise en francais.
  // ------------------------------------------------------------------------
  constructor(lineNumber: number, message: string) {
    super(lineNumber > 0 ? `Ligne ${lineNumber} : ${message}` : message);
    this.name = "BytecodeAssemblyError";
    this.lineNumber = lineNumber;
  }
}

// ----------------------------------------------------------------------------
// Assemble une source L3D en conteneur binaire version 1.
//
// Parametres :
// - source : texte contenant labels et instructions.
// - options : generation et label d'entree facultatifs.
//
// Retour :
// - conteneur, payload et metadonnees calculees.
// --------------------------------------------------------------------------
export function assembleBytecodeSource(
  source: string,
  options: BytecodeAssemblyOptions = {},
): AssembledBytecodeProgram {
  // Resultat adresse produit par la premiere passe.
  const parsed = parseAssemblySource(source);
  if (parsed.payloadLength === 0) {
    throw new BytecodeAssemblyError(0, "Le programme ne contient aucune instruction");
  }
  // Generation transactionnelle demandee ou valeur initiale.
  const generation = options.generation ?? 0;
  requireRange(generation, 0, 255, 0, "Generation hors plage");
  // Offset de la premiere instruction a executer.
  const entryPoint = resolveEntryPoint(parsed, options.entryLabel);
  // Payload alloue a sa taille finale exacte.
  const payload = new Uint8Array(parsed.payloadLength);
  let capabilities = 0;
  for (const statement of parsed.statements) {
    // Opcode courant utilise pour accumuler les capacites requises.
    const opcode = encodeStatement(statement, parsed.labels, payload);
    capabilities |= capabilityForOpcode(opcode);
  }
  // Conteneur final compose de l'en-tete fixe et du payload.
  const container = new Uint8Array(BYTECODE_HEADER_SIZE + payload.length);
  if (container.length > BYTECODE_CONTAINER_MAX_SIZE) {
    throw new BytecodeAssemblyError(0, "Conteneur superieur a 197 octets");
  }
  container.set(BYTECODE_MAGIC, 0);
  container[BYTECODE_FORMAT_VERSION_OFFSET] = BYTECODE_FORMAT_VERSION;
  container[BYTECODE_VM_VERSION_OFFSET] = BYTECODE_VM_VERSION;
  container[BYTECODE_CAPABILITIES_OFFSET] = capabilities;
  container[BYTECODE_GENERATION_OFFSET] = generation;
  container[BYTECODE_PAYLOAD_LENGTH_OFFSET] = payload.length;
  container[BYTECODE_ENTRY_POINT_OFFSET] = entryPoint;
  container[BYTECODE_FLAGS_OFFSET] = 0;
  container.set(payload, BYTECODE_HEADER_SIZE);
  writeBytecodeUint16(container, BYTECODE_CRC_OFFSET, calculateBytecodeCrc(container));
  return { container, payload, capabilities, entryPoint, generation };
}

// ----------------------------------------------------------------------------
// Analyse les lignes, enregistre les labels et calcule chaque adresse.
//
// Parametres :
// - source : assembleur L3D a parcourir.
//
// Retour :
// - instructions adressees, labels et longueur du payload.
// --------------------------------------------------------------------------
function parseAssemblySource(source: string): ParsedAssemblySource {
  // Instructions adressees conservees dans leur ordre source.
  const statements: SourceStatement[] = [];
  // Table des labels normalises vers leur offset de payload.
  const labels = new Map<string, number>();
  let address = 0;
  // Lignes source conservees avec leurs indices pour les erreurs.
  const lines = source.split(/\r?\n/u);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    // Numero un-indexe affiche dans les erreurs.
    const lineNumber = lineIndex + 1;
    let content = stripComment(lines[lineIndex] ?? "").trim();
    if (content.length === 0) continue;
    // Label facultatif situe au debut de la ligne utile.
    const labelMatch = /^([A-Za-z_][A-Za-z0-9_]*):/u.exec(content);
    if (labelMatch) {
      // Nom canonique utilise pour detecter aussi les doublons de casse.
      const label = normalizeLabel(labelMatch[1] ?? "");
      if (labels.has(label)) {
        throw new BytecodeAssemblyError(lineNumber, `Label duplique ${label}`);
      }
      labels.set(label, address);
      content = content.slice(labelMatch[0].length).trim();
      if (content.length === 0) continue;
    }
    // Jetons d'instruction apres normalisation des separateurs.
    const tokens = content.replaceAll(",", " ").split(/\s+/u);
    // Mnemonique canonique insensible a la casse.
    const mnemonic = (tokens.shift() ?? "").toUpperCase();
    // Taille contractuelle utilisee pour calculer l'adresse suivante.
    const size = INSTRUCTION_SIZES[mnemonic];
    if (size === undefined) {
      throw new BytecodeAssemblyError(lineNumber, `Mnemonique inconnu ${mnemonic}`);
    }
    statements.push({ lineNumber, address, mnemonic, operands: tokens });
    address += size;
    if (address > BYTECODE_PAYLOAD_MAX_SIZE) {
      throw new BytecodeAssemblyError(lineNumber, "Payload superieur a 185 octets");
    }
  }
  return { statements, labels, payloadLength: address };
}

// ----------------------------------------------------------------------------
// Retire les commentaires # ou // sans modifier le texte precedent.
//
// Parametres :
// - line : ligne source brute.
//
// Retour :
// - portion precedant le premier marqueur de commentaire.
// --------------------------------------------------------------------------
function stripComment(line: string): string {
  // Position du commentaire de style shell.
  const hashOffset = line.indexOf("#");
  // Position du commentaire de style C++.
  const slashOffset = line.indexOf("//");
  let endOffset = line.length;
  if (hashOffset >= 0) endOffset = Math.min(endOffset, hashOffset);
  if (slashOffset >= 0) endOffset = Math.min(endOffset, slashOffset);
  return line.slice(0, endOffset);
}

// ----------------------------------------------------------------------------
// Resout le point d'entree demande ou choisit la premiere instruction.
//
// Parametres :
// - parsed : resultat adresse de la premiere passe.
// - entryLabel : label d'entree facultatif demande par l'appelant.
//
// Retour :
// - offset d'une instruction valide dans le payload.
// --------------------------------------------------------------------------
function resolveEntryPoint(parsed: ParsedAssemblySource, entryLabel?: string): number {
  if (entryLabel === undefined) return 0;
  // Adresse associee au nom normalise demande.
  const address = parsed.labels.get(normalizeLabel(entryLabel));
  if (address === undefined || !hasStatementAtAddress(parsed.statements, address)) {
    throw new BytecodeAssemblyError(0, `Point d'entree invalide ${entryLabel}`);
  }
  return address;
}

// ----------------------------------------------------------------------------
// Indique si un offset correspond au debut d'une instruction source.
//
// Parametres :
// - statements : instructions adressees de la premiere passe.
// - address : offset de payload recherche.
//
// Retour :
// - vrai quand une instruction commence exactement a cet offset.
// ----------------------------------------------------------------------------
function hasStatementAtAddress(
  statements: readonly SourceStatement[],
  address: number,
): boolean {
  for (const statement of statements) {
    if (statement.address === address) return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Encode une instruction resolue a son adresse finale.
//
// Parametres :
// - statement : instruction source adressee.
// - labels : table des cibles resolues en premiere passe.
// - payload : destination binaire preallouee.
//
// Retour :
// - opcode encode, utilise pour calculer les capacites.
//
// Effet de bord :
// - ecrit l'instruction dans payload.
// --------------------------------------------------------------------------
function encodeStatement(
  statement: SourceStatement,
  labels: ReadonlyMap<string, number>,
  payload: Uint8Array,
): BytecodeOpcode {
  // Fermeture qui centralise les controles de taille et l'ecriture.
  const write = createStatementWriter(statement, payload);
  switch (statement.mnemonic) {
    case "HALT": return write(BytecodeOpcode.Halt, []);
    case "CLEAR": return write(BytecodeOpcode.Clear, []);
    case "SHOW": return write(BytecodeOpcode.Show, []);
    case "YIELD": return write(BytecodeOpcode.Yield, []);
    case "FADE": return write(BytecodeOpcode.Fade, [u8(statement, 0)]);
    case "SET_I8": return write(BytecodeOpcode.SetI8, [singleRegister(statement, 0), i8(statement, 1)]);
    case "SET_U8": return write(BytecodeOpcode.SetU8, [singleRegister(statement, 0), u8(statement, 1)]);
    case "COPY": return write(BytecodeOpcode.Copy, [registerPair(statement, 0, 1)]);
    case "ADD_I8": return write(BytecodeOpcode.AddI8, [singleRegister(statement, 0), i8(statement, 1)]);
    case "ADD_REG": return write(BytecodeOpcode.AddReg, [registerPair(statement, 0, 1)]);
    case "SUB_REG": return write(BytecodeOpcode.SubReg, [registerPair(statement, 0, 1)]);
    case "SIN8": return write(BytecodeOpcode.Sin8, [registerPair(statement, 0, 1)]);
    case "RAND_U8": {
      // Borne basse incluse du tirage aleatoire.
      const minimum = u8(statement, 1);
      // Borne haute incluse du tirage aleatoire.
      const maximum = u8(statement, 2);
      if (minimum > maximum) {
        throw new BytecodeAssemblyError(statement.lineNumber, "Bornes RAND_U8 inversees");
      }
      return write(BytecodeOpcode.RandomU8, [singleRegister(statement, 0), minimum, maximum]);
    }
    case "COLOR_RGB": return write(BytecodeOpcode.ColorRgb, [u8(statement, 0), u8(statement, 1), u8(statement, 2)]);
    case "COLOR_WHEEL": return write(BytecodeOpcode.ColorWheel, [singleRegister(statement, 0)]);
    case "COLOR_REGS": return write(BytecodeOpcode.ColorRegisters, registerTriple(statement, 0));
    case "VOXEL": return write(BytecodeOpcode.Voxel, registerTriple(statement, 0));
    case "SPHERE": {
      // Rayon entier de la sphere pleine.
      const radius = u8(statement, 3);
      requireRange(radius, 1, 7, statement.lineNumber, "Rayon SPHERE hors plage");
      return write(BytecodeOpcode.Sphere, [...registerTriple(statement, 0), radius]);
    }
    case "BOUNCE": {
      // Limite basse incluse du deplacement.
      const minimum = signedValue(statement, 2);
      // Limite haute incluse du deplacement.
      const maximum = signedValue(statement, 3);
      if (minimum > maximum) {
        throw new BytecodeAssemblyError(statement.lineNumber, "Bornes BOUNCE inversees");
      }
      return write(BytecodeOpcode.Bounce, [
        registerPair(statement, 0, 1),
        minimum & 0xff,
        maximum & 0xff,
      ]);
    }
    case "PARTICLE_CONFIG": {
      // Nombre maximal de particules actives pour ce programme.
      const count = u8(statement, 0);
      // Duree initiale mesuree en passages PARTICLE_STEP.
      const life = u8(statement, 3);
      requireRange(count, 1, 32, statement.lineNumber, "Nombre de particules hors plage");
      requireRange(life, 1, 255, statement.lineNumber, "Duree de particule hors plage");
      return write(BytecodeOpcode.ParticleConfigure, [
        count,
        i8(statement, 1),
        u8(statement, 2),
        life,
      ]);
    }
    case "PARTICLE_EMIT": return write(BytecodeOpcode.ParticleEmit, registerSix(statement));
    case "PARTICLE_STEP": return write(BytecodeOpcode.ParticleStep, []);
    case "JUMP": return write(BytecodeOpcode.Jump, [relativeTarget(statement, 0, labels)]);
    case "JLT": return write(BytecodeOpcode.JumpIfLess, [registerPair(statement, 0, 1), relativeTarget(statement, 2, labels)]);
    case "WAIT": {
      // Duree non bloquante exprimee en millisecondes.
      const duration = integerOperand(statement, 0);
      requireRange(duration, 0, 60_000, statement.lineNumber, "WAIT hors plage");
      requireOperandCount(statement, 1);
      return write(BytecodeOpcode.Wait, [duration & 0xff, (duration >>> 8) & 0xff]);
    }
    default:
      throw new BytecodeAssemblyError(statement.lineNumber, "Instruction non encodee");
  }
}

// ----------------------------------------------------------------------------
// Cree une fonction d'ecriture bornee a l'adresse d'une instruction.
//
// Parametres :
// - statement : instruction dont l'adresse et la taille sont deja connues.
// - payload : destination binaire preallouee.
//
// Retour :
// - fonction qui controle puis ecrit un opcode et ses operandes.
// --------------------------------------------------------------------------
function createStatementWriter(statement: SourceStatement, payload: Uint8Array) {
  // --------------------------------------------------------------------------
  // Controle et ecrit l'instruction liee a la fermeture courante.
  //
  // Parametres :
  // - opcode : operation binaire a placer.
  // - operands : octets d'operandes deja valides.
  //
  // Retour :
  // - opcode ecrit pour le calcul des capacites.
  //
  // Effet de bord :
  // - ecrit dans le payload capture par la fermeture.
  // --------------------------------------------------------------------------
  const writeStatement = (
    opcode: BytecodeOpcode,
    operands: readonly number[],
  ): BytecodeOpcode => {
    // Taille binaire imposee par le mnemonique courant.
    const expectedSize = INSTRUCTION_SIZES[statement.mnemonic] ?? 0;
    requireOperandCount(statement, expectedOperandCount(statement.mnemonic));
    if (operands.length + 1 !== expectedSize) {
      throw new BytecodeAssemblyError(statement.lineNumber, "Taille encodee incoherente");
    }
    payload[statement.address] = opcode;
    payload.set(operands, statement.address + 1);
    return opcode;
  };
  return writeStatement;
}

// ----------------------------------------------------------------------------
// Retourne le nombre d'operandes textuels attendu par un mnemonique.
//
// Parametres :
// - mnemonic : nom canonique majuscule de l'instruction.
//
// Retour :
// - nombre attendu, ou -1 pour un nom absent du contrat.
// --------------------------------------------------------------------------
function expectedOperandCount(mnemonic: string): number {
  if (["HALT", "CLEAR", "SHOW", "YIELD", "PARTICLE_STEP"].includes(mnemonic)) return 0;
  if (["FADE", "COLOR_WHEEL", "JUMP", "WAIT"].includes(mnemonic)) return 1;
  if (["SET_I8", "SET_U8", "COPY", "ADD_I8", "ADD_REG", "SUB_REG", "SIN8"].includes(mnemonic)) return 2;
  if (["RAND_U8", "COLOR_RGB", "COLOR_REGS", "VOXEL", "JLT"].includes(mnemonic)) return 3;
  if (["SPHERE", "BOUNCE", "PARTICLE_CONFIG"].includes(mnemonic)) return 4;
  if (mnemonic === "PARTICLE_EMIT") return 6;
  return -1;
}

// ----------------------------------------------------------------------------
// Verifie le nombre exact d'operandes textuels.
//
// Parametres :
// - statement : instruction source a verifier.
// - expected : nombre exact impose par le mnemonique.
// --------------------------------------------------------------------------
function requireOperandCount(statement: SourceStatement, expected: number): void {
  if (statement.operands.length !== expected) {
    throw new BytecodeAssemblyError(
      statement.lineNumber,
      `${expected} operande(s) attendu(s), ${statement.operands.length} recu(s)`,
    );
  }
}

// ----------------------------------------------------------------------------
// Lit un operande entier decimal ou hexadecimal.
//
// Parametres :
// - statement : instruction source contenant l'operande.
// - operandIndex : position de l'operande a lire.
//
// Retour :
// - valeur entiere signee analysee.
// --------------------------------------------------------------------------
function integerOperand(statement: SourceStatement, operandIndex: number): number {
  // Texte brut de l'operande a analyser.
  const text = statement.operands[operandIndex];
  if (text === undefined || !/^-?(?:0x[0-9a-f]+|\d+)$/iu.test(text)) {
    throw new BytecodeAssemblyError(statement.lineNumber, `Entier invalide ${text ?? "absent"}`);
  }
  // Indique si le signe doit etre reapplique apres le parsing de la magnitude.
  const negative = text.startsWith("-");
  // Partie absolue acceptee par Number.parseInt.
  const unsignedText = negative ? text.slice(1) : text;
  // Valeur absolue analysee dans sa base decimale ou hexadecimale.
  const value = Number.parseInt(unsignedText, unsignedText.toLowerCase().startsWith("0x") ? 16 : 10);
  return negative ? -value : value;
}

// ----------------------------------------------------------------------------
// Lit un operande non signe sur huit bits.
//
// Parametres :
// - statement : instruction source contenant l'operande.
// - operandIndex : position de l'operande a lire.
//
// Retour :
// - valeur comprise entre 0 et 255.
// --------------------------------------------------------------------------
function u8(statement: SourceStatement, operandIndex: number): number {
  // Valeur entiere a borner sur un octet non signe.
  const value = integerOperand(statement, operandIndex);
  requireRange(value, 0, 255, statement.lineNumber, "Valeur u8 hors plage");
  return value;
}

// ----------------------------------------------------------------------------
// Lit et encode un operande signe sur huit bits.
//
// Parametres :
// - statement : instruction source contenant l'operande.
// - operandIndex : position de l'operande a lire.
//
// Retour :
// - representation non signee de l'octet signe.
// --------------------------------------------------------------------------
function i8(statement: SourceStatement, operandIndex: number): number {
  return signedValue(statement, operandIndex) & 0xff;
}

// ----------------------------------------------------------------------------
// Lit un operande signe sur huit bits sans convertir sa representation.
//
// Parametres :
// - statement : instruction source contenant l'operande.
// - operandIndex : position de l'operande a lire.
//
// Retour :
// - valeur comprise entre -128 et 127.
// ----------------------------------------------------------------------------
function signedValue(statement: SourceStatement, operandIndex: number): number {
  // Valeur entiere a borner sur un octet signe.
  const value = integerOperand(statement, operandIndex);
  requireRange(value, -128, 127, statement.lineNumber, "Valeur i8 hors plage");
  return value;
}

// ----------------------------------------------------------------------------
// Lit un identifiant R0 a R15.
//
// Parametres :
// - statement : instruction source contenant le registre.
// - operandIndex : position du registre a lire.
//
// Retour :
// - index compris entre 0 et 15.
// --------------------------------------------------------------------------
function register(statement: SourceStatement, operandIndex: number): number {
  // Texte brut de l'identifiant de registre.
  const text = statement.operands[operandIndex] ?? "";
  // Capture de la partie numerique apres le prefixe R.
  const match = /^R(\d{1,2})$/iu.exec(text);
  // Index numerique ou sentinelle invalide en absence de capture.
  const value = match ? Number(match[1]) : -1;
  requireRange(value, 0, 15, statement.lineNumber, `Registre invalide ${text}`);
  return value;
}

// ----------------------------------------------------------------------------
// Encode un registre seul avec nibble haut nul.
//
// Parametres :
// - statement : instruction source contenant le registre.
// - operandIndex : position du registre a lire.
//
// Retour :
// - octet canonique du registre.
// --------------------------------------------------------------------------
function singleRegister(statement: SourceStatement, operandIndex: number): number {
  return register(statement, operandIndex);
}

// ----------------------------------------------------------------------------
// Encode deux registres dans un octet.
//
// Parametres :
// - statement : instruction source contenant les registres.
// - first : position du registre place dans le nibble haut.
// - second : position du registre place dans le nibble bas.
//
// Retour :
// - octet compact contenant les deux index.
// --------------------------------------------------------------------------
function registerPair(statement: SourceStatement, first: number, second: number): number {
  return (register(statement, first) << 4) | register(statement, second);
}

// ----------------------------------------------------------------------------
// Encode trois registres dans deux octets avec nibble reserve nul.
//
// Parametres :
// - statement : instruction source contenant les registres.
// - first : position du premier des trois registres.
//
// Retour :
// - deux octets compacts, dont le dernier nibble reste nul.
// --------------------------------------------------------------------------
function registerTriple(statement: SourceStatement, first: number): [number, number] {
  return [
    registerPair(statement, first, first + 1),
    register(statement, first + 2) << 4,
  ];
}

// ----------------------------------------------------------------------------
// Encode six registres dans trois octets.
//
// Parametres :
// - statement : instruction source contenant exactement six registres.
//
// Retour :
// - trois paires compactes dans l'ordre source.
// --------------------------------------------------------------------------
function registerSix(statement: SourceStatement): [number, number, number] {
  return [
    registerPair(statement, 0, 1),
    registerPair(statement, 2, 3),
    registerPair(statement, 4, 5),
  ];
}

// ----------------------------------------------------------------------------
// Resout un label ou un offset explicite vers un saut relatif signe.
//
// Parametres :
// - statement : instruction de branchement adressee.
// - operandIndex : position de la cible dans les operandes.
// - labels : table des labels de la premiere passe.
//
// Retour :
// - representation sur huit bits de l'offset relatif signe.
// --------------------------------------------------------------------------
function relativeTarget(
  statement: SourceStatement,
  operandIndex: number,
  labels: ReadonlyMap<string, number>,
): number {
  // Texte de cible pouvant etre un offset decimal ou un label.
  const text = statement.operands[operandIndex] ?? "";
  let relativeOffset: number;
  if (/^-?\d+$/u.test(text)) {
    relativeOffset = Number.parseInt(text, 10);
  } else {
    // Adresse absolue du label normalise dans le payload.
    const target = labels.get(normalizeLabel(text));
    if (target === undefined) {
      throw new BytecodeAssemblyError(statement.lineNumber, `Label inconnu ${text}`);
    }
    relativeOffset = target - (statement.address + (INSTRUCTION_SIZES[statement.mnemonic] ?? 0));
  }
  requireRange(relativeOffset, -128, 127, statement.lineNumber, "Branchement relatif hors plage");
  return relativeOffset & 0xff;
}

// ----------------------------------------------------------------------------
// Normalise un label sans rendre les mnemonniques sensibles a la casse.
//
// Parametres :
// - label : nom source a normaliser.
//
// Retour :
// - label canonique en majuscules.
// --------------------------------------------------------------------------
function normalizeLabel(label: string): string {
  return label.toUpperCase();
}

// ----------------------------------------------------------------------------
// Verifie qu'une valeur entiere appartient a une plage fermee.
//
// Parametres :
// - value : valeur a verifier.
// - minimum : borne basse incluse.
// - maximum : borne haute incluse.
// - lineNumber : ligne source a associer a une erreur.
// - message : cause lisible a remonter.
// --------------------------------------------------------------------------
function requireRange(
  value: number,
  minimum: number,
  maximum: number,
  lineNumber: number,
  message: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new BytecodeAssemblyError(lineNumber, message);
  }
}
