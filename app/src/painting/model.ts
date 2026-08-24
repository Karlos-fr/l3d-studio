// ============================================================================
// PaintingModel - Modele versionne des dessins de voxels
// ----------------------------------------------------------------------------
// Ce module conserve couleur et luminosite par voxel, valide les archives JSON
// et produit un framebuffer RGB. Il ne connait ni le DOM ni le serveur LAN.
// ============================================================================

import {
  getStreamingVoxelIndex,
  STREAM_CUBE_SIDE,
  STREAM_VOXEL_COUNT,
  StreamingFramebuffer,
} from "../streaming/framebuffer";

// Outils volontairement limites au dessin et a l'effacement.
export type PainterTool = "draw" | "erase";

// Document de dessin independant de son framebuffer rendu.
export interface PainterDrawing {
  colors: StreamingFramebuffer;
  brightness: Uint8Array;
  globalBrightnessPercent: number;
}

// Stockage minimal attendu, compatible avec localStorage et les tests.
export interface PainterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Cle versionnee du nouveau document JSON local.
export const PAINTER_STORAGE_KEY = "l3d-studio:painter-frame:v2";

// Cle historique relue uniquement pour migrer les anciens brouillons RGB888.
const LEGACY_PAINTER_STORAGE_KEY = "l3d-studio:painter-frame:v1";

// Nombre de caracteres du framebuffer hexadecimal historique.
const LEGACY_PAINTER_SERIALIZED_LENGTH = 3_072;

// Identifiant stable du format exporte par L3D Studio.
const PAINTER_DOCUMENT_FORMAT = "l3d-painting";

// Version courante du schema JSON public.
const PAINTER_DOCUMENT_VERSION = 1;

// Expression d'une couleur HTML complete acceptee par le modele.
const PAINTER_COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

// Taille textuelle maximale d'une archive avant son passage a JSON.parse.
const PAINTER_MAXIMUM_JSON_LENGTH = 262_144;

// Description JSON publique d'un voxel non eteint.
interface PainterJsonVoxel {
  x: number;
  y: number;
  z: number;
  color: string;
  brightness: number;
}

// Description JSON publique complete du dessin.
interface PainterJsonDocument {
  format: string;
  version: number;
  cubeSize: number;
  globalBrightness: number;
  voxels: PainterJsonVoxel[];
}

// ----------------------------------------------------------------------------
// Cree un document noir avec toutes les luminosites individuelles a 100 %.
//
// Retour :
// - dessin independant pret a etre peint.
// ----------------------------------------------------------------------------
export function createPainterDrawing(): PainterDrawing {
  // Tableau compact qui conserve la luminosite propre aux 512 voxels.
  const brightness = new Uint8Array(STREAM_VOXEL_COUNT);
  brightness.fill(100);
  return {
    colors: new StreamingFramebuffer(),
    brightness,
    globalBrightnessPercent: 1,
  };
}

// ----------------------------------------------------------------------------
// Charge le document JSON local ou migre l'ancien framebuffer hexadecimal.
//
// Parametres :
// - storage : stockage local du navigateur.
//
// Retour :
// - dernier dessin valide ou document noir.
// ----------------------------------------------------------------------------
export function loadPainterDrawing(storage: PainterStorage): PainterDrawing {
  try {
    // Archive versionnee prioritaire lue depuis le stockage fourni.
    const serialized = storage.getItem(PAINTER_STORAGE_KEY);
    if (serialized !== null) return importPainterDrawing(serialized);
    return loadLegacyPainterDrawing(storage.getItem(LEGACY_PAINTER_STORAGE_KEY));
  } catch {
    return createPainterDrawing();
  }
}

// ----------------------------------------------------------------------------
// Sauvegarde le document dans le meme format JSON que l'export utilisateur.
//
// Parametres :
// - storage : stockage local cible.
// - drawing : dessin courant a conserver.
//
// Effet de bord :
// - remplace la valeur versionnee dans le stockage fourni.
// ----------------------------------------------------------------------------
export function savePainterDrawing(storage: PainterStorage, drawing: PainterDrawing): void {
  storage.setItem(PAINTER_STORAGE_KEY, exportPainterDrawing(drawing));
}

// ----------------------------------------------------------------------------
// Exporte uniquement les voxels non noirs dans un document JSON lisible.
//
// Parametres :
// - drawing : dessin source avec luminosites individuelles.
//
// Retour :
// - archive JSON versionnee et independante de la configuration LAN.
// ----------------------------------------------------------------------------
export function exportPainterDrawing(drawing: PainterDrawing): string {
  // Liste publique limitee aux voxels effectivement allumes.
  const voxels: PainterJsonVoxel[] = [];
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        // Index lineaire du voxel courant dans les buffers du dessin.
        const voxelIndex = getStreamingVoxelIndex(x, y, z);
        // Position de sa composante rouge dans le tableau RGB888.
        const componentIndex = voxelIndex * 3;
        // Canal rouge non attenue du voxel courant.
        const red = drawing.colors.colors[componentIndex] ?? 0;
        // Canal vert non attenue du voxel courant.
        const green = drawing.colors.colors[componentIndex + 1] ?? 0;
        // Canal bleu non attenue du voxel courant.
        const blue = drawing.colors.colors[componentIndex + 2] ?? 0;
        if (red === 0 && green === 0 && blue === 0) continue;
        voxels.push({
          x,
          y,
          z,
          color: `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`,
          brightness: drawing.brightness[voxelIndex] ?? 100,
        });
      }
    }
  }
  // Enveloppe publique versionnee serialisee dans le fichier utilisateur.
  const document: PainterJsonDocument = {
    format: PAINTER_DOCUMENT_FORMAT,
    version: PAINTER_DOCUMENT_VERSION,
    cubeSize: STREAM_CUBE_SIDE,
    globalBrightness: normalizePainterBrightness(drawing.globalBrightnessPercent),
    voxels,
  };
  return JSON.stringify(document, null, 2);
}

// ----------------------------------------------------------------------------
// Importe et valide integralement une archive avant de creer le dessin.
//
// Parametres :
// - serialized : contenu JSON fourni par l'utilisateur.
//
// Retour :
// - nouveau document sans partage de buffers avec l'ancien.
//
// Erreur :
// - refuse format, version, doublons, bornes, couleurs et luminosites invalides.
// ----------------------------------------------------------------------------
export function importPainterDrawing(serialized: string): PainterDrawing {
  if (serialized.length > PAINTER_MAXIMUM_JSON_LENGTH) {
    throw new Error("Le fichier de dessin dépasse la taille maximale autorisée.");
  }
  // Valeur inconnue conservee telle quelle jusqu'a validation complete.
  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) throw new Error("Le dessin JSON doit être un objet.");
  if (parsed.format !== PAINTER_DOCUMENT_FORMAT || parsed.version !== PAINTER_DOCUMENT_VERSION) {
    throw new Error("Format ou version de dessin non pris en charge.");
  }
  if (parsed.cubeSize !== STREAM_CUBE_SIDE || !Array.isArray(parsed.voxels)) {
    throw new Error("Le dessin doit décrire un cube 8 × 8 × 8.");
  }
  if (!isPainterBrightness(parsed.globalBrightness)) {
    throw new Error("La luminosité globale doit être comprise entre 1 et 100.");
  }
  if (parsed.voxels.length > STREAM_VOXEL_COUNT) {
    throw new Error("Le dessin contient plus de 512 voxels.");
  }
  // Nouveau dessin isole qui ne remplace l'ancien qu'apres validation.
  const drawing = createPainterDrawing();
  drawing.globalBrightnessPercent = parsed.globalBrightness;
  // Marqueurs compacts utilises pour refuser deux fois la meme coordonnee.
  const occupied = new Uint8Array(STREAM_VOXEL_COUNT);
  for (const candidate of parsed.voxels) {
    if (!isPainterJsonVoxel(candidate)) throw new Error("Un voxel du dessin est invalide.");
    // Index valide du voxel en cours d'import.
    const voxelIndex = getStreamingVoxelIndex(candidate.x, candidate.y, candidate.z);
    if (voxelIndex < 0 || occupied[voxelIndex] !== 0) {
      throw new Error("Coordonnée de voxel invalide ou dupliquée.");
    }
    occupied[voxelIndex] = 1;
    // Canal rouge extrait de la couleur HTML validee.
    const red = Number.parseInt(candidate.color.slice(1, 3), 16);
    // Canal vert extrait de la couleur HTML validee.
    const green = Number.parseInt(candidate.color.slice(3, 5), 16);
    // Canal bleu extrait de la couleur HTML validee.
    const blue = Number.parseInt(candidate.color.slice(5, 7), 16);
    drawing.colors.setVoxel(candidate.x, candidate.y, candidate.z, red, green, blue);
    drawing.brightness[voxelIndex] = candidate.brightness;
  }
  return drawing;
}

// ----------------------------------------------------------------------------
// Applique couleur et luminosite du pinceau a un voxel logique.
//
// Parametres :
// - drawing : document modifie sur place.
// - x, y, z : coordonnees entieres de zero a sept.
// - color : couleur HTML non attenuee du pinceau.
// - brightnessPercent : luminosite propre au voxel entre 1 et 100.
// - tool : outil de dessin actif.
//
// Retour :
// - vrai lorsque toutes les valeurs ont permis l'ecriture.
// ----------------------------------------------------------------------------
export function paintVoxel(
  drawing: PainterDrawing,
  x: number,
  y: number,
  z: number,
  color: string,
  brightnessPercent: number,
  tool: PainterTool,
): boolean {
  if (!PAINTER_COLOR_PATTERN.test(color) || !isPainterBrightness(brightnessPercent)) return false;
  // Index lineaire controle avant toute modification du dessin.
  const voxelIndex = getStreamingVoxelIndex(x, y, z);
  if (voxelIndex < 0) return false;
  drawing.brightness[voxelIndex] = brightnessPercent;
  if (tool === "erase") return drawing.colors.setVoxel(x, y, z, 0, 0, 0);
  // Canal rouge du pinceau non attenue.
  const red = Number.parseInt(color.slice(1, 3), 16);
  // Canal vert du pinceau non attenue.
  const green = Number.parseInt(color.slice(3, 5), 16);
  // Canal bleu du pinceau non attenue.
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return drawing.colors.setVoxel(x, y, z, red, green, blue);
}

// ----------------------------------------------------------------------------
// Efface les couleurs et remet les luminosites individuelles a 100 %.
//
// Parametres :
// - drawing : dessin a vider.
// ----------------------------------------------------------------------------
export function clearPainterDrawing(drawing: PainterDrawing): void {
  drawing.colors.clear();
  drawing.brightness.fill(100);
}

// ----------------------------------------------------------------------------
// Produit le framebuffer attenue uniquement par la luminosite de chaque voxel.
//
// Parametres :
// - drawing : document source non modifie.
// - target : framebuffer destination reutilisable.
// Effet de bord :
// - remplace les 1 536 composantes RGB de `target`.
// ----------------------------------------------------------------------------
export function renderPainterDrawing(
  drawing: PainterDrawing,
  target: StreamingFramebuffer,
): void {
  for (let voxelIndex = 0; voxelIndex < STREAM_VOXEL_COUNT; voxelIndex += 1) {
    // Position de la composante rouge du voxel dans les tableaux RGB888.
    const componentIndex = voxelIndex * 3;
    // Multiplicateur propre au voxel courant.
    const individualFactor = (drawing.brightness[voxelIndex] ?? 100) / 100;
    target.colors[componentIndex] = Math.round((drawing.colors.colors[componentIndex] ?? 0) * individualFactor);
    target.colors[componentIndex + 1] = Math.round((drawing.colors.colors[componentIndex + 1] ?? 0) * individualFactor);
    target.colors[componentIndex + 2] = Math.round((drawing.colors.colors[componentIndex + 2] ?? 0) * individualFactor);
  }
}

// ----------------------------------------------------------------------------
// Migre le format hexadecimal historique vers le nouveau document.
//
// Parametres :
// - serialized : ancienne valeur locale ou absence de brouillon.
//
// Retour :
// - dessin migre avec luminosites individuelles a 100 %.
// ----------------------------------------------------------------------------
function loadLegacyPainterDrawing(serialized: string | null): PainterDrawing {
  // Document destination initialise avec les nouvelles valeurs par defaut.
  const drawing = createPainterDrawing();
  if (
    serialized === null ||
    serialized.length !== LEGACY_PAINTER_SERIALIZED_LENGTH ||
    !/^[0-9a-f]+$/iu.test(serialized)
  ) return drawing;
  for (let index = 0; index < drawing.colors.colors.length; index += 1) {
    drawing.colors.colors[index] = Number.parseInt(serialized.slice(index * 2, index * 2 + 2), 16);
  }
  return drawing;
}

// ----------------------------------------------------------------------------
// Verifie la forme JSON minimale d'un voxel exporte.
//
// Parametres :
// - value : valeur inconnue issue de JSON.parse.
//
// Retour :
// - vrai lorsque toutes les proprietes respectent le contrat.
// ----------------------------------------------------------------------------
function isPainterJsonVoxel(value: unknown): value is PainterJsonVoxel {
  return isRecord(value) &&
    Number.isInteger(value.x) && Number.isInteger(value.y) && Number.isInteger(value.z) &&
    typeof value.color === "string" && PAINTER_COLOR_PATTERN.test(value.color) &&
    isPainterBrightness(value.brightness);
}

// ----------------------------------------------------------------------------
// Verifie une luminosite entiere entre 1 et 100.
//
// Parametres :
// - value : valeur inconnue a controler.
//
// Retour :
// - vrai pour un entier compris entre 1 et 100.
// ----------------------------------------------------------------------------
function isPainterBrightness(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100;
}

// ----------------------------------------------------------------------------
// Borne une luminosite interne avant export.
//
// Parametres :
// - value : luminosite interne eventuellement hors plage.
//
// Retour :
// - entier compris entre 1 et 100.
// ----------------------------------------------------------------------------
function normalizePainterBrightness(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

// ----------------------------------------------------------------------------
// Distingue un objet JSON des tableaux et valeurs primitives.
//
// Parametres :
// - value : valeur inconnue issue du parseur.
//
// Retour :
// - vrai lorsque des proprietes nommees peuvent etre lues.
// ----------------------------------------------------------------------------
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ----------------------------------------------------------------------------
// Formate un canal sur exactement deux caracteres hexadecimaux.
//
// Parametres :
// - value : canal RGB sur huit bits.
//
// Retour :
// - representation hexadecimale sur deux caracteres.
// ----------------------------------------------------------------------------
function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}
