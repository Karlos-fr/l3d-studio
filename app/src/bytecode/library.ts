// ============================================================================
// BytecodeLibrary - Bibliotheque locale des sources procedurales L3D
// ----------------------------------------------------------------------------
// Ce module persiste uniquement noms et sources dans localStorage. Il ne
// connait ni token Particle, ni transport LAN, ni DOM.
// ============================================================================

// Version du document exporte et du stockage local.
const BYTECODE_LIBRARY_VERSION = 1;

// Cle localStorage reservee a la bibliotheque procedurale.
const BYTECODE_LIBRARY_STORAGE_KEY = "l3d.bytecode.library.v1";

// Nombre maximal de sources conservees localement.
const BYTECODE_LIBRARY_ENTRY_LIMIT = 64;

// Longueur maximale d'un nom utilisateur.
const BYTECODE_LIBRARY_NAME_LIMIT = 64;

// Longueur maximale d'une source assembleur locale.
const BYTECODE_LIBRARY_SOURCE_LIMIT = 16_384;

// Entree utilisateur persistante et exportable.
export interface BytecodeLibraryEntry {
  id: string;
  name: string;
  source: string;
  updatedAt: number;
}

// Document public sans configuration personnelle.
export interface BytecodeLibraryDocument {
  version: 1;
  entries: BytecodeLibraryEntry[];
}

// ----------------------------------------------------------------------------
// Charge une bibliotheque locale en ignorant un document corrompu.
//
// Parametres :
// - storage : stockage navigateur compatible localStorage.
//
// Retour :
// - copie valide des entrees, vide si le document est absent ou invalide.
// ----------------------------------------------------------------------------
export function loadBytecodeLibrary(storage: Storage): BytecodeLibraryEntry[] {
  const serialized = storage.getItem(BYTECODE_LIBRARY_STORAGE_KEY);
  if (serialized === null) return [];
  try {
    return parseBytecodeLibraryDocument(serialized).entries;
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Persiste une copie bornee de la bibliotheque.
//
// Parametres :
// - storage : stockage navigateur compatible localStorage.
// - entries : entrees deja gerees par l'interface.
// ----------------------------------------------------------------------------
export function saveBytecodeLibrary(
  storage: Storage,
  entries: readonly BytecodeLibraryEntry[],
): void {
  const document: BytecodeLibraryDocument = {
    version: 1,
    entries: validateEntries(entries),
  };
  storage.setItem(BYTECODE_LIBRARY_STORAGE_KEY, JSON.stringify(document));
}

// ----------------------------------------------------------------------------
// Cree une nouvelle entree avec un identifiant local opaque.
//
// Parametres :
// - name : nom visible demande.
// - source : source assembleur a conserver.
// - now : horodatage de modification.
// - randomValue : valeur aleatoire facultative pour les tests.
//
// Retour :
// - entree valide prete a etre ajoutee.
// ----------------------------------------------------------------------------
export function createBytecodeLibraryEntry(
  name: string,
  source: string,
  now = Date.now(),
  randomValue = Math.random(),
): BytecodeLibraryEntry {
  validateName(name);
  validateSource(source);
  const randomPart = Math.floor(Math.max(0, Math.min(0.999999, randomValue)) * 0xFFFFFF)
    .toString(36)
    .padStart(5, "0");
  return {
    id: `program-${now.toString(36)}-${randomPart}`,
    name: name.trim(),
    source,
    updatedAt: now,
  };
}

// ----------------------------------------------------------------------------
// Duplique une entree avec un nouvel identifiant et un nom distinct.
//
// Parametres :
// - entry : entree source.
// - now : horodatage de la copie.
//
// Retour :
// - nouvelle entree independante.
// ----------------------------------------------------------------------------
export function duplicateBytecodeLibraryEntry(
  entry: BytecodeLibraryEntry,
  now = Date.now(),
): BytecodeLibraryEntry {
  return createBytecodeLibraryEntry(`${entry.name} - copie`, entry.source, now);
}

// ----------------------------------------------------------------------------
// Renomme une entree sans modifier sa source ni son identifiant.
//
// Parametres :
// - entry : entree existante.
// - name : nouveau nom visible.
// - now : horodatage de modification.
//
// Retour :
// - nouvelle valeur immuable.
// ----------------------------------------------------------------------------
export function renameBytecodeLibraryEntry(
  entry: BytecodeLibraryEntry,
  name: string,
  now = Date.now(),
): BytecodeLibraryEntry {
  validateName(name);
  return { ...entry, name: name.trim(), updatedAt: now };
}

// ----------------------------------------------------------------------------
// Remplace la source d'une entree existante.
//
// Parametres :
// - entry : entree existante.
// - source : nouveau texte assembleur.
// - now : horodatage de modification.
//
// Retour :
// - nouvelle valeur immuable.
// ----------------------------------------------------------------------------
export function updateBytecodeLibraryEntry(
  entry: BytecodeLibraryEntry,
  source: string,
  now = Date.now(),
): BytecodeLibraryEntry {
  validateSource(source);
  return { ...entry, source, updatedAt: now };
}

// ----------------------------------------------------------------------------
// Exporte uniquement les donnees de la bibliotheque procedurale.
//
// Parametres :
// - entries : sources utilisateur a exporter.
//
// Retour :
// - document JSON sans token ni preference de transport.
// ----------------------------------------------------------------------------
export function exportBytecodeLibrary(entries: readonly BytecodeLibraryEntry[]): string {
  const document: BytecodeLibraryDocument = {
    version: 1,
    entries: validateEntries(entries),
  };
  return JSON.stringify(document, null, 2);
}

// ----------------------------------------------------------------------------
// Importe et valide integralement un document avant remplacement.
//
// Parametres :
// - serialized : texte JSON choisi par l'utilisateur.
//
// Retour :
// - entrees importees sans champ externe.
// ----------------------------------------------------------------------------
export function importBytecodeLibrary(serialized: string): BytecodeLibraryEntry[] {
  return parseBytecodeLibraryDocument(serialized).entries;
}

// ----------------------------------------------------------------------------
// Parse un document JSON en refusant versions et structures inconnues.
//
// Parametres :
// - serialized : contenu JSON complet.
//
// Retour :
// - document reconstruit avec les seuls champs autorises.
// ----------------------------------------------------------------------------
function parseBytecodeLibraryDocument(serialized: string): BytecodeLibraryDocument {
  const value: unknown = JSON.parse(serialized);
  if (typeof value !== "object" || value === null) throw new Error("Bibliotheque invalide");
  const candidate = value as { version?: unknown; entries?: unknown };
  if (candidate.version !== BYTECODE_LIBRARY_VERSION || !Array.isArray(candidate.entries)) {
    throw new Error("Version de bibliotheque non prise en charge");
  }
  return { version: 1, entries: validateEntries(candidate.entries) };
}

// ----------------------------------------------------------------------------
// Valide une collection complete et reconstruit ses champs autorises.
//
// Parametres :
// - entries : valeurs inconnues issues du stockage ou de l'import.
//
// Retour :
// - entrees bornees sans doublon d'identifiant.
// ----------------------------------------------------------------------------
function validateEntries(entries: readonly unknown[]): BytecodeLibraryEntry[] {
  if (entries.length > BYTECODE_LIBRARY_ENTRY_LIMIT) throw new Error("Bibliotheque trop grande");
  const identifiers = new Set<string>();
  const validatedEntries: BytecodeLibraryEntry[] = [];
  for (const value of entries) {
    if (typeof value !== "object" || value === null) throw new Error("Entree invalide");
    const entry = value as Partial<BytecodeLibraryEntry>;
    if (
      typeof entry.id !== "string" || !/^program-[a-z0-9-]+$/u.test(entry.id) ||
      typeof entry.name !== "string" || typeof entry.source !== "string" ||
      typeof entry.updatedAt !== "number" || !Number.isSafeInteger(entry.updatedAt) || entry.updatedAt < 0
    ) {
      throw new Error("Entree de bibliotheque invalide");
    }
    validateName(entry.name);
    validateSource(entry.source);
    if (identifiers.has(entry.id)) throw new Error("Identifiant de programme duplique");
    identifiers.add(entry.id);
    validatedEntries.push({
      id: entry.id,
      name: entry.name.trim(),
      source: entry.source,
      updatedAt: entry.updatedAt,
    });
  }
  return validatedEntries;
}

// ----------------------------------------------------------------------------
// Valide un nom utilisateur borne.
//
// Parametres :
// - name : nom candidat.
// ----------------------------------------------------------------------------
function validateName(name: string): void {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > BYTECODE_LIBRARY_NAME_LIMIT) {
    throw new Error("Le nom doit contenir entre 1 et 64 caracteres.");
  }
}

// ----------------------------------------------------------------------------
// Valide une source locale sans tenter de l'assembler.
//
// Parametres :
// - source : texte candidat.
// ----------------------------------------------------------------------------
function validateSource(source: string): void {
  if (source.length === 0 || source.length > BYTECODE_LIBRARY_SOURCE_LIMIT) {
    throw new Error("La source doit contenir entre 1 et 16384 caracteres.");
  }
}
