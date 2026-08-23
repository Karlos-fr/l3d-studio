// ============================================================================
// StreamingRender - Mise a jour legere du panneau de streaming
// ----------------------------------------------------------------------------
// Ce module actualise les compteurs et projette les voxels sur un Canvas 2D.
// La camera se tourne a la souris sans moteur 3D ni reconstruction du DOM.
// ============================================================================

import { STREAM_CUBE_SIDE, type StreamingFramebuffer } from "../streaming/framebuffer";
import { projectStreamingPoint } from "../streaming/projection";
import type { AppState } from "./state";

// Selecteur du panneau de streaming web.
const STREAMING_PANEL_SELECTOR = "[data-streaming-panel]";

// Hauteur minimale qui protege la lisibilite du cube et des couches.
const STREAMING_PREVIEW_MINIMUM_HEIGHT = 260;

// Densite maximale du bitmap afin de borner le cout des grands ecrans HiDPI.
const STREAMING_PREVIEW_MAXIMUM_PIXEL_RATIO = 1.5;

// Centre geometrique des coordonnees zero a sept utilise par la projection.
const STREAMING_PREVIEW_CUBE_CENTER = 3.5;

// Opacite des reperes eteints afin de voir les voxels places derriere eux.
const STREAMING_OFF_VOXEL_OPACITY = 0.12;

// Opacite des voxels lumineux qui conserve couleur et profondeur visibles.
const STREAMING_LIT_VOXEL_OPACITY = 0.68;

// Taille fixe des sprites rasterises une seule fois pour chaque couleur RGB332.
const STREAMING_VOXEL_SPRITE_SIZE = 48;

// Demi-largeur du cube dessine dans le sprite de reference.
const STREAMING_VOXEL_SPRITE_HALF_WIDTH = 9;

// Position verticale du centre projete dans le sprite de reference.
const STREAMING_VOXEL_SPRITE_ANCHOR_Y = 18;

// Sprites bornes aux 256 couleurs physiques plus le repere eteint.
const streamingVoxelSpriteCache = new Map<number, HTMLCanvasElement>();

// Deux representations disponibles sans modifier la frame source.
type StreamingPreviewMode = "3d" | "layers";

// Sensibilite de la rotation en radians par pixel de souris.
const STREAMING_CAMERA_SENSITIVITY = 0.012;

// Inclinaison verticale maximale pour ne pas retourner la camera.
const STREAMING_CAMERA_PITCH_LIMIT = 1.35;

// Orientation conservee lorsque l'application reconstruit son panneau.
let streamingCameraYaw = -0.7;
let streamingCameraPitch = 0.48;

// Vue conservee lorsque l'application reconstruit le panneau.
let streamingPreviewMode: StreamingPreviewMode = "3d";

// Derniere frame necessaire pour redessiner pendant un glisser de souris.
let latestStreamingFramebuffer: StreamingFramebuffer | null = null;

// Voxel projete et trie avant son dessin.
interface StreamingPreviewVoxel {
  screenX: number;
  screenY: number;
  depth: number;
  componentIndex: number;
  red: number;
  green: number;
  blue: number;
}

// Projection triee reutilisee tant que camera et dimensions restent stables.
const cachedStreamingProjection: StreamingPreviewVoxel[] = [];

// Largeur CSS associee a la projection mise en cache.
let cachedStreamingProjectionWidth = 0;

// Hauteur CSS associee a la projection mise en cache.
let cachedStreamingProjectionHeight = 0;

// Orientation horizontale associee a la projection mise en cache.
let cachedStreamingProjectionYaw = Number.NaN;

// Orientation verticale associee a la projection mise en cache.
let cachedStreamingProjectionPitch = Number.NaN;

// Geometrie partagee entre le dessin des couches et leur hit-test.
interface StreamingLayerLayout {
  layerWidth: number;
  layerHeight: number;
  cellSize: number;
}

// Coordonnees logiques retournees pour une cellule de la vue par couches.
export interface StreamingLayerVoxel {
  x: number;
  y: number;
  z: number;
}

// ----------------------------------------------------------------------------
// Selectionne une representation avant le prochain rendu du panneau.
//
// Parametres :
// - mode : vue 3D ou couches z.
//
// Effet de bord :
// - conserve le choix pendant les reconstructions du DOM.
// ----------------------------------------------------------------------------
export function selectStreamingPreviewMode(mode: StreamingPreviewMode): void {
  streamingPreviewMode = mode;
}

// ----------------------------------------------------------------------------
// Retrouve le voxel situe sous un point de la vue par couches.
//
// Parametres :
// - canvas : surface actuellement affichee.
// - clientX, clientY : coordonnees du pointeur dans la fenetre.
//
// Retour :
// - voxel logique ou null hors d'une grille et dans la vue 3D.
// ----------------------------------------------------------------------------
export function getStreamingLayerVoxelAtPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): StreamingLayerVoxel | null {
  if (streamingPreviewMode !== "layers") return null;
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const cssWidth = Math.max(canvas.clientWidth, 280);
  const pointX = (clientX - bounds.left) * (cssWidth / bounds.width);
  const cssHeight = Math.max(canvas.clientHeight, STREAMING_PREVIEW_MINIMUM_HEIGHT);
  const pointY = (clientY - bounds.top) * (cssHeight / bounds.height);
  const layout = calculateStreamingLayerLayout(cssWidth, cssHeight);
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    const layerColumn = z % 4;
    const layerRow = Math.floor(z / 4);
    const gridWidth = layout.cellSize * STREAM_CUBE_SIDE;
    const originX = layerColumn * layout.layerWidth + (layout.layerWidth - gridWidth) / 2;
    const originY = layerRow * layout.layerHeight + 30;
    const column = Math.floor((pointX - originX) / layout.cellSize);
    const row = Math.floor((pointY - originY) / layout.cellSize);
    if (column >= 0 && column < STREAM_CUBE_SIDE && row >= 0 && row < STREAM_CUBE_SIDE) {
      return { x: column, y: 7 - row, z };
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Actualise les compteurs et le Canvas du panneau deja monte.
//
// Parametres :
// - rootElement : racine DOM de l'application.
// - state : etat contenant les compteurs a afficher.
// - framebuffer : frame logique courante pour l'apercu.
//
// Effet de bord :
// - dessine uniquement le panneau vivant sans remplacer ses controles.
// ----------------------------------------------------------------------------
export function updateStreamingView(
  rootElement: HTMLElement,
  state: AppState,
  framebuffer: StreamingFramebuffer,
): void {
  const panelElement = rootElement.querySelector<HTMLElement>(STREAMING_PANEL_SELECTOR);
  if (panelElement === null) return;
  setText(panelElement, "[data-streaming-status]", state.streaming.statusMessage);
  setText(panelElement, "[data-streaming-sent]", String(state.streaming.sentFrames));
  setText(panelElement, "[data-streaming-dropped]", String(state.streaming.droppedFrames));
  setText(panelElement, "[data-streaming-measured]", state.streaming.measuredFps.toFixed(1));
  setText(panelElement, "[data-streaming-fps-value]", `${state.streaming.targetFps} FPS`);
  setText(
    panelElement,
    "[data-streaming-speed-value]",
    `${state.streaming.movementStepsPerSecond} /s`,
  );
  setText(
    panelElement,
    "[data-streaming-brightness-value]",
    `${state.streaming.brightnessPercent} %`,
  );
  const toggleButton = panelElement.querySelector<HTMLButtonElement>("[data-streaming-toggle]");
  if (toggleButton !== null) {
    const lanConfigured = state.lanHost.trim().length > 0 && Number.isInteger(state.lanPort);
    toggleButton.dataset.action = state.streaming.active ? "stop-streaming" : "start-streaming";
    toggleButton.textContent = state.streaming.active
      ? "Arrêter"
      : state.streaming.workspace === "painting"
        ? "Afficher sur le cube"
        : "Démarrer";
    toggleButton.disabled = state.isBusy || (!state.streaming.active && !lanConfigured);
    toggleButton.classList.toggle("primary-action", !state.streaming.active);
    toggleButton.classList.toggle("secondary-action", state.streaming.active);
  }
  drawStreamingPreview(panelElement, framebuffer);
}

// ----------------------------------------------------------------------------
// Remplace le texte d'un descendant lorsqu'il existe.
//
// Parametres :
// - parentElement : panneau inspecte.
// - selector : selecteur du noeud textuel.
// - value : texte a afficher.
// ----------------------------------------------------------------------------
function setText(parentElement: HTMLElement, selector: string, value: string): void {
  const element = parentElement.querySelector<HTMLElement>(selector);
  if (element !== null) element.textContent = value;
}

// ----------------------------------------------------------------------------
// Dessine le cube projete et branche sa camera si necessaire.
//
// Parametres :
// - panelElement : panneau contenant le Canvas.
// - framebuffer : couleurs logiques courantes.
// ----------------------------------------------------------------------------
function drawStreamingPreview(
  panelElement: HTMLElement,
  framebuffer: StreamingFramebuffer,
): void {
  const canvas = panelElement.querySelector<HTMLCanvasElement>("[data-streaming-preview]");
  if (canvas === null) return;
  latestStreamingFramebuffer = framebuffer;
  bindStreamingPreviewTabs(panelElement, canvas);
  bindStreamingCamera(canvas);
  bindStreamingFullscreen(panelElement, canvas);
  syncStreamingPreviewTabs(panelElement, canvas);
  drawStreamingCanvas(canvas, framebuffer);
}

// ----------------------------------------------------------------------------
// Branche une fois les deux onglets de representation du framebuffer.
//
// Parametres :
// - panelElement : panneau contenant les boutons d'onglet.
// - canvas : surface commune aux deux representations.
// ----------------------------------------------------------------------------
function bindStreamingPreviewTabs(
  panelElement: HTMLElement,
  canvas: HTMLCanvasElement,
): void {
  if (panelElement.dataset.streamingTabsBound === "1") return;
  panelElement.dataset.streamingTabsBound = "1";
  const buttons = panelElement.querySelectorAll<HTMLButtonElement>("[data-streaming-preview-mode]");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const requestedMode = button.dataset.streamingPreviewMode;
      if (requestedMode !== "3d" && requestedMode !== "layers") return;
      streamingPreviewMode = requestedMode;
      syncStreamingPreviewTabs(panelElement, canvas);
      if (latestStreamingFramebuffer !== null) {
        drawStreamingCanvas(canvas, latestStreamingFramebuffer);
      }
    });
  }
}

// ----------------------------------------------------------------------------
// Aligne les attributs accessibles et le curseur sur l'onglet courant.
//
// Parametres :
// - panelElement : panneau contenant les onglets.
// - canvas : panneau visuel controle par les onglets.
// ----------------------------------------------------------------------------
function syncStreamingPreviewTabs(
  panelElement: HTMLElement,
  canvas: HTMLCanvasElement,
): void {
  const buttons = panelElement.querySelectorAll<HTMLButtonElement>("[data-streaming-preview-mode]");
  for (const button of buttons) {
    const selected = button.dataset.streamingPreviewMode === streamingPreviewMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
  }
  const threeDimensional = streamingPreviewMode === "3d";
  canvas.classList.toggle("is-layers-view", !threeDimensional);
  canvas.setAttribute(
    "aria-label",
    threeDimensional ? "Aperçu 3D rotatif du cube" : "Aperçu des huit couches z du cube",
  );
}

// ----------------------------------------------------------------------------
// Branche une fois le glisser horizontal et vertical de la camera.
//
// Parametres :
// - canvas : surface interactive a initialiser.
//
// Effet de bord :
// - capture le pointeur pendant le glisser et redessine la derniere frame.
// ----------------------------------------------------------------------------
function bindStreamingCamera(canvas: HTMLCanvasElement): void {
  if (canvas.dataset.streamingCameraBound === "1") return;
  canvas.dataset.streamingCameraBound = "1";
  let activePointerId: number | null = null;
  let previousX = 0;
  let previousY = 0;

  canvas.addEventListener("pointerdown", (event) => {
    if (streamingPreviewMode !== "3d") return;
    activePointerId = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-rotating");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId) return;
    streamingCameraYaw += (event.clientX - previousX) * STREAMING_CAMERA_SENSITIVITY;
    streamingCameraPitch = Math.max(
      -STREAMING_CAMERA_PITCH_LIMIT,
      Math.min(
        STREAMING_CAMERA_PITCH_LIMIT,
        streamingCameraPitch + (event.clientY - previousY) * STREAMING_CAMERA_SENSITIVITY,
      ),
    );
    previousX = event.clientX;
    previousY = event.clientY;
    if (latestStreamingFramebuffer !== null) {
      drawStreamingCanvas(canvas, latestStreamingFramebuffer);
    }
  });

  // Termine aussi proprement une capture annulee par le navigateur.
  const releasePointer = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    canvas.classList.remove("is-rotating");
  };
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
}

// ----------------------------------------------------------------------------
// Branche le bouton plein ecran sur le conteneur visuel du canvas.
//
// Parametres :
// - panelElement : panneau contenant le bouton a initialiser une seule fois.
// - canvas : canvas dont le parent constitue la surface plein ecran.
//
// Effet de bord :
// - demande le plein ecran au navigateur lorsque cette API est disponible.
// ----------------------------------------------------------------------------
function bindStreamingFullscreen(
  panelElement: HTMLElement,
  canvas: HTMLCanvasElement,
): void {
  if (panelElement.dataset.streamingFullscreenBound === "1") return;
  // Bouton optionnel reserve a la vue 3D principale.
  const button = panelElement.querySelector<HTMLButtonElement>("[data-streaming-fullscreen]");
  // Conteneur qui conserve les controles superposes en plein ecran.
  const surface = canvas.parentElement;
  if (button === null || surface === null) return;
  // Surface non nulle capturee par le callback apres la validation du DOM.
  const fullscreenSurface = surface;
  panelElement.dataset.streamingFullscreenBound = "1";

  // --------------------------------------------------------------------------
  // Ouvre ou ferme la surface sans modifier la camera ni le framebuffer.
  //
  // Effet de bord :
  // - appelle l'API plein ecran du navigateur.
  // --------------------------------------------------------------------------
  function toggleStreamingFullscreen(): void {
    if (document.fullscreenElement === fullscreenSurface) {
      void document.exitFullscreen();
      return;
    }
    if (fullscreenSurface.requestFullscreen !== undefined) {
      void fullscreenSurface.requestFullscreen();
    }
  }

  button.addEventListener("click", toggleStreamingFullscreen);
}

// ----------------------------------------------------------------------------
// Projette puis dessine les 512 positions, le cadre et les voxels allumes.
//
// Parametres :
// - canvas : surface dimensionnee selon son affichage CSS.
// - framebuffer : frame RGB a representer.
// ----------------------------------------------------------------------------
function drawStreamingCanvas(
  canvas: HTMLCanvasElement,
  framebuffer: StreamingFramebuffer,
): void {
  if (streamingPreviewMode === "layers") {
    drawStreamingLayers(canvas, framebuffer);
    return;
  }
  drawStreamingThreeDimensional(canvas, framebuffer);
}

// ----------------------------------------------------------------------------
// Dessine un framebuffer externe avec la projection 3D du streaming.
//
// Parametres :
// - canvas : surface distincte fournie par un autre outil de l'application.
// - framebuffer : cube RGB logique a projeter.
//
// Effet de bord :
// - redimensionne puis redessine uniquement le canvas fourni.
// ----------------------------------------------------------------------------
export function drawStreamingFramebufferPreview(
  canvas: HTMLCanvasElement,
  framebuffer: StreamingFramebuffer,
): void {
  const previousMode = streamingPreviewMode;
  streamingPreviewMode = "3d";
  drawStreamingCanvas(canvas, framebuffer);
  streamingPreviewMode = previousMode;
}

// ----------------------------------------------------------------------------
// Projette puis dessine la representation 3D courante.
//
// Parametres :
// - canvas : surface dimensionnee selon son affichage CSS.
// - framebuffer : frame RGB a representer.
// ----------------------------------------------------------------------------
function drawStreamingThreeDimensional(
  canvas: HTMLCanvasElement,
  framebuffer: StreamingFramebuffer,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, STREAMING_PREVIEW_MAXIMUM_PIXEL_RATIO);
  const cssWidth = Math.max(canvas.clientWidth, 280);
  const cssHeight = Math.max(canvas.clientHeight, STREAMING_PREVIEW_MINIMUM_HEIGHT);
  const bitmapWidth = Math.round(cssWidth * pixelRatio);
  const bitmapHeight = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  // Halo bleu nuit qui detache le volume du fond de la carte.
  const background = context.createRadialGradient(
    cssWidth * 0.5,
    cssHeight * 0.42,
    10,
    cssWidth * 0.5,
    cssHeight * 0.5,
    Math.max(cssWidth, cssHeight) * 0.65,
  );
  background.addColorStop(0, "#101f35");
  background.addColorStop(0.55, "#091525");
  background.addColorStop(1, "#060d18");
  context.fillStyle = background;
  context.fillRect(0, 0, cssWidth, cssHeight);

  // Centre horizontal de la projection dans la surface courante.
  const centerX = cssWidth / 2;
  // Centre vertical legerement abaisse pour equilibrer les faces visibles.
  const centerY = cssHeight / 2 + 3;
  // Echelle responsive commune au cadre et aux 512 voxels.
  const projectionScale = Math.min(cssWidth, cssHeight) * 0.112;
  drawStreamingCubeFrame(context, centerX, centerY, projectionScale);

  // La geometrie et son tri ne changent pas pendant une animation sans rotation.
  const projectedVoxels = getCachedStreamingProjection(
    cssWidth,
    cssHeight,
    centerX,
    centerY,
    projectionScale,
  );
  updateStreamingProjectionColors(projectedVoxels, framebuffer.colors);
  for (const voxel of projectedVoxels) {
    drawStreamingVoxel(context, voxel, projectionScale * 0.31);
  }
}

// ----------------------------------------------------------------------------
// Retourne la projection triee et ne la reconstruit qu'apres rotation ou resize.
//
// Parametres :
// - cssWidth, cssHeight : dimensions courantes de la surface.
// - centerX, centerY : centre de projection en pixels CSS.
// - projectionScale : pixels CSS correspondant a une unite logique.
//
// Retour :
// - tableau stable des 512 positions classees du fond vers l'avant.
//
// Effet de bord :
// - remplace le cache partage lorsque sa geometrie est devenue obsolete.
// ----------------------------------------------------------------------------
function getCachedStreamingProjection(
  cssWidth: number,
  cssHeight: number,
  centerX: number,
  centerY: number,
  projectionScale: number,
): StreamingPreviewVoxel[] {
  // Validite stricte du cache pour la camera et la surface courantes.
  const cacheValid =
    cachedStreamingProjection.length === STREAM_CUBE_SIDE ** 3 &&
    cachedStreamingProjectionWidth === cssWidth &&
    cachedStreamingProjectionHeight === cssHeight &&
    cachedStreamingProjectionYaw === streamingCameraYaw &&
    cachedStreamingProjectionPitch === streamingCameraPitch;
  if (cacheValid) return cachedStreamingProjection;

  cachedStreamingProjection.length = 0;
  // Cosinus horizontal partage par les 512 voxels.
  const yawCosine = Math.cos(streamingCameraYaw);
  // Sinus horizontal partage par les 512 voxels.
  const yawSine = Math.sin(streamingCameraYaw);
  // Cosinus vertical partage par les 512 voxels.
  const pitchCosine = Math.cos(streamingCameraPitch);
  // Sinus vertical partage par les 512 voxels.
  const pitchSine = Math.sin(streamingCameraPitch);
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        // Coordonnee x recentree autour de l'origine de la camera.
        const centeredX = x - STREAMING_PREVIEW_CUBE_CENTER;
        // Coordonnee y recentree autour de l'origine de la camera.
        const centeredY = y - STREAMING_PREVIEW_CUBE_CENTER;
        // Coordonnee z recentree autour de l'origine de la camera.
        const centeredZ = z - STREAMING_PREVIEW_CUBE_CENTER;
        // Abscisse apres rotation horizontale.
        const horizontal = centeredX * yawCosine - centeredZ * yawSine;
        // Profondeur intermediaire apres rotation horizontale.
        const yawDepth = centeredX * yawSine + centeredZ * yawCosine;
        // Ordonnee finale apres inclinaison verticale.
        const vertical = centeredY * pitchCosine - yawDepth * pitchSine;
        // Profondeur finale utilisee par le tri des transparences.
        const depth = centeredY * pitchSine + yawDepth * pitchCosine;
        // Index RGB stable du voxel dans le framebuffer contigu.
        const componentIndex = (z * STREAM_CUBE_SIDE * STREAM_CUBE_SIDE + y * STREAM_CUBE_SIDE + x) * 3;
        cachedStreamingProjection.push({
          screenX: centerX + horizontal * projectionScale,
          screenY: centerY - vertical * projectionScale,
          depth,
          componentIndex,
          red: 0,
          green: 0,
          blue: 0,
        });
      }
    }
  }
  cachedStreamingProjection.sort((left, right) => left.depth - right.depth);
  cachedStreamingProjectionWidth = cssWidth;
  cachedStreamingProjectionHeight = cssHeight;
  cachedStreamingProjectionYaw = streamingCameraYaw;
  cachedStreamingProjectionPitch = streamingCameraPitch;
  return cachedStreamingProjection;
}

// ----------------------------------------------------------------------------
// Copie les couleurs courantes dans une projection sans allouer de triplets RGB.
//
// Parametres :
// - projectedVoxels : positions triees portant leur index de composante source.
// - colors : framebuffer RGB contigu de la frame courante.
//
// Effet de bord :
// - actualise uniquement les trois canaux de chaque position mise en cache.
// ----------------------------------------------------------------------------
function updateStreamingProjectionColors(
  projectedVoxels: StreamingPreviewVoxel[],
  colors: Uint8Array,
): void {
  for (const voxel of projectedVoxels) {
    voxel.red = colors[voxel.componentIndex] ?? 0;
    voxel.green = colors[voxel.componentIndex + 1] ?? 0;
    voxel.blue = colors[voxel.componentIndex + 2] ?? 0;
  }
}

// ----------------------------------------------------------------------------
// Dessine l'ancienne representation en huit grilles z de 8 par 8.
//
// Parametres :
// - canvas : surface commune aux deux onglets.
// - framebuffer : frame RGB a lire sans la modifier.
// ----------------------------------------------------------------------------
function drawStreamingLayers(
  canvas: HTMLCanvasElement,
  framebuffer: StreamingFramebuffer,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, STREAMING_PREVIEW_MAXIMUM_PIXEL_RATIO);
  const cssWidth = Math.max(canvas.clientWidth, 280);
  const cssHeight = Math.max(canvas.clientHeight, STREAMING_PREVIEW_MINIMUM_HEIGHT);
  const bitmapWidth = Math.round(cssWidth * pixelRatio);
  const bitmapHeight = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = "#08111f";
  context.fillRect(0, 0, cssWidth, cssHeight);

  const layout = calculateStreamingLayerLayout(cssWidth, cssHeight);
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    const layerColumn = z % 4;
    const layerRow = Math.floor(z / 4);
    const gridWidth = layout.cellSize * STREAM_CUBE_SIDE;
    const originX = layerColumn * layout.layerWidth + (layout.layerWidth - gridWidth) / 2;
    const originY = layerRow * layout.layerHeight + 30;
    context.fillStyle = "#9fb3c8";
    context.font = "11px system-ui";
    context.fillText(`z=${z}`, originX, originY - 7);
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        const [red, green, blue] = framebuffer.getVoxel(x, 7 - y, z);
        context.fillStyle = red === 0 && green === 0 && blue === 0
          ? "rgba(148, 163, 184, 0.12)"
          : `rgb(${red} ${green} ${blue})`;
        context.fillRect(
          originX + x * layout.cellSize,
          originY + y * layout.cellSize,
          Math.max(layout.cellSize - 1, 1),
          Math.max(layout.cellSize - 1, 1),
        );
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Calcule la grille commune aux huit couches du cube.
//
// Parametres :
// - cssWidth : largeur logique disponible en pixels CSS.
// - cssHeight : hauteur logique disponible en pixels CSS.
//
// Retour :
// - largeur de couche, hauteur de couche et taille de cellule.
// ----------------------------------------------------------------------------
function calculateStreamingLayerLayout(
  cssWidth: number,
  cssHeight: number,
): StreamingLayerLayout {
  // Largeur reservee a chacune des quatre couches d'une ligne.
  const layerWidth = cssWidth / 4;
  return {
    layerWidth,
    layerHeight: cssHeight / 2,
    cellSize: Math.min(
      (layerWidth - 20) / STREAM_CUBE_SIDE,
      (cssHeight / 2 - 42) / STREAM_CUBE_SIDE,
      14,
    ),
  };
}

// ----------------------------------------------------------------------------
// Dessine les douze aretes du volume logique.
//
// Parametres :
// - context : contexte Canvas courant.
// - centerX, centerY : centre de projection en pixels CSS.
// - scale : pixels CSS par unite logique.
// ----------------------------------------------------------------------------
function drawStreamingCubeFrame(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scale: number,
): void {
  const corners: Array<readonly [number, number, number]> = [
    [0, 0, 0], [7, 0, 0], [0, 7, 0], [7, 7, 0],
    [0, 0, 7], [7, 0, 7], [0, 7, 7], [7, 7, 7],
  ];
  const edges: Array<readonly [number, number]> = [
    [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
    [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
  ];
  context.strokeStyle = "rgba(148, 163, 184, 0.36)";
  context.lineWidth = 1;
  context.beginPath();
  for (const [startIndex, endIndex] of edges) {
    const start = corners[startIndex];
    const end = corners[endIndex];
    if (start === undefined || end === undefined) continue;
    const projectedStart = projectStreamingPoint(
      start[0], start[1], start[2], streamingCameraYaw, streamingCameraPitch,
    );
    const projectedEnd = projectStreamingPoint(
      end[0], end[1], end[2], streamingCameraYaw, streamingCameraPitch,
    );
    context.moveTo(
      centerX + projectedStart.horizontal * scale,
      centerY - projectedStart.vertical * scale,
    );
    context.lineTo(
      centerX + projectedEnd.horizontal * scale,
      centerY - projectedEnd.vertical * scale,
    );
  }
  context.stroke();
}

// ----------------------------------------------------------------------------
// Dessine un voxel depuis un sprite rasterise et reutilisable.
//
// Parametres :
// - context : contexte Canvas courant.
// - voxel : position projetee, profondeur et couleur RGB.
// - size : largeur de base derivee de l'espacement de la projection.
// ----------------------------------------------------------------------------
function drawStreamingVoxel(
  context: CanvasRenderingContext2D,
  voxel: StreamingPreviewVoxel,
  size: number,
): void {
  // Canal maximal utilise pour distinguer un voxel allume d'un repere eteint.
  const intensity = Math.max(voxel.red, voxel.green, voxel.blue);
  // Legere variation de taille qui renforce la profondeur sans deformer le cube.
  const depthFactor = Math.max(0.82, Math.min(1.14, 1 + voxel.depth * 0.025));
  // Sprite deja calcule pour la couleur physique RGB332 la plus proche.
  const sprite = getStreamingVoxelSprite(voxel.red, voxel.green, voxel.blue, intensity);
  // Facteur qui restitue la largeur logique du cube de reference.
  const spriteScale = (size * depthFactor) / STREAMING_VOXEL_SPRITE_HALF_WIDTH;
  // Dimension finale du halo et du cube en pixels CSS.
  const renderedSize = STREAMING_VOXEL_SPRITE_SIZE * spriteScale;
  context.drawImage(
    sprite,
    voxel.screenX - renderedSize / 2,
    voxel.screenY - STREAMING_VOXEL_SPRITE_ANCHOR_Y * spriteScale,
    renderedSize,
    renderedSize,
  );
}

// ----------------------------------------------------------------------------
// Retourne le sprite eteint ou RGB332 correspondant a un voxel.
//
// Parametres :
// - red, green, blue : canaux RGB888 produits par l'animation web.
// - intensity : canal maximal utilise pour detecter un voxel eteint.
//
// Retour :
// - petit canvas transparent partage par tous les voxels de meme couleur.
//
// Effet de bord :
// - cree au plus 257 sprites, puis les reutilise sans nouveau trace vectoriel.
// ----------------------------------------------------------------------------
function getStreamingVoxelSprite(
  red: number,
  green: number,
  blue: number,
  intensity: number,
): HTMLCanvasElement {
  // Couleur physique compacte utilisee comme cle de cache stable.
  const rgb332 = ((red >> 5) << 5) | ((green >> 5) << 2) | (blue >> 6);
  // Zero reste reserve au repere eteint et les couleurs commencent a un.
  const cacheKey = intensity === 0 ? 0 : rgb332 + 1;
  // Sprite existant retourne sans recreer gradients ni polygones.
  const cachedSprite = streamingVoxelSpriteCache.get(cacheKey);
  if (cachedSprite !== undefined) return cachedSprite;
  // Rouge restitue depuis ses trois bits physiques.
  const spriteRed = intensity === 0 ? 18 : Math.round(((rgb332 >> 5) & 0x07) * 255 / 7);
  // Vert restitue depuis ses trois bits physiques.
  const spriteGreen = intensity === 0 ? 37 : Math.round(((rgb332 >> 2) & 0x07) * 255 / 7);
  // Bleu restitue depuis ses deux bits physiques.
  const spriteBlue = intensity === 0 ? 72 : Math.round((rgb332 & 0x03) * 255 / 3);
  // Nouveau sprite construit une seule fois pour cette cle bornee.
  const sprite = createStreamingVoxelSprite(spriteRed, spriteGreen, spriteBlue, intensity > 0);
  streamingVoxelSpriteCache.set(cacheKey, sprite);
  return sprite;
}

// ----------------------------------------------------------------------------
// Rasterise un cube translucide et son halo lumineux optionnel.
//
// Parametres :
// - red, green, blue : couleur RGB332 restituee sur huit bits.
// - lit : vrai pour ajouter le coeur et le halo d'une LED active.
//
// Retour :
// - sprite Canvas transparent pret pour des centaines de drawImage rapides.
// ----------------------------------------------------------------------------
function createStreamingVoxelSprite(
  red: number,
  green: number,
  blue: number,
  lit: boolean,
): HTMLCanvasElement {
  // Surface autonome qui evite gradients et chemins dans la boucle de frame.
  const sprite = document.createElement("canvas");
  sprite.width = STREAMING_VOXEL_SPRITE_SIZE;
  sprite.height = STREAMING_VOXEL_SPRITE_SIZE;
  // Contexte local utilise uniquement pendant la creation du sprite.
  const context = sprite.getContext("2d");
  if (context === null) return sprite;
  // Centre horizontal commun au halo et aux trois faces.
  const centerX = STREAMING_VOXEL_SPRITE_SIZE / 2;
  // Centre vertical de la face superieure et du coeur lumineux.
  const centerY = STREAMING_VOXEL_SPRITE_ANCHOR_Y;
  // Demi-hauteur isometrique de la face superieure.
  const halfHeight = STREAMING_VOXEL_SPRITE_HALF_WIDTH * 0.58;
  // Hauteur des faces laterales du cube de reference.
  const bodyHeight = STREAMING_VOXEL_SPRITE_HALF_WIDTH * 1.08;
  // Transparence commune du verre eteint ou de la LED active.
  const opacity = lit ? STREAMING_LIT_VOXEL_OPACITY : STREAMING_OFF_VOXEL_OPACITY;

  if (lit) {
    // Halo radial prerendu dont le cout ne depend plus de la cadence des frames.
    const halo = context.createRadialGradient(centerX, centerY, 1, centerX, centerY, 22);
    halo.addColorStop(0, `rgb(${red} ${green} ${blue} / 0.58)`);
    halo.addColorStop(0.28, `rgb(${red} ${green} ${blue} / 0.32)`);
    halo.addColorStop(1, `rgb(${red} ${green} ${blue} / 0)`);
    context.fillStyle = halo;
    context.fillRect(0, 0, STREAMING_VOXEL_SPRITE_SIZE, STREAMING_VOXEL_SPRITE_SIZE);
  }

  fillStreamingVoxelSpriteFace(
    context,
    [
      [centerX, centerY - halfHeight],
      [centerX + STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY],
      [centerX, centerY + halfHeight],
      [centerX - STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY],
    ],
    scaleStreamingColor(red, green, blue, lit ? 1.2 : 0.75, opacity),
  );
  fillStreamingVoxelSpriteFace(
    context,
    [
      [centerX - STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY],
      [centerX, centerY + halfHeight],
      [centerX, centerY + halfHeight + bodyHeight],
      [centerX - STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY + bodyHeight],
    ],
    scaleStreamingColor(red, green, blue, lit ? 0.68 : 0.42, opacity * 0.88),
  );
  fillStreamingVoxelSpriteFace(
    context,
    [
      [centerX + STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY],
      [centerX, centerY + halfHeight],
      [centerX, centerY + halfHeight + bodyHeight],
      [centerX + STREAMING_VOXEL_SPRITE_HALF_WIDTH, centerY + bodyHeight],
    ],
    scaleStreamingColor(red, green, blue, lit ? 0.84 : 0.55, opacity * 0.94),
  );

  if (lit) {
    context.beginPath();
    context.arc(centerX, centerY - halfHeight * 0.18, 2.2, 0, Math.PI * 2);
    context.fillStyle = `rgb(255 255 255 / 0.72)`;
    context.fill();
  }
  return sprite;
}

// ----------------------------------------------------------------------------
// Remplit une face du sprite cree hors de la boucle d'animation.
//
// Parametres :
// - context : contexte du petit Canvas mis en cache.
// - points : quatre sommets dans leur ordre de parcours.
// - color : couleur translucide et deja ombree de la face.
// ----------------------------------------------------------------------------
function fillStreamingVoxelSpriteFace(
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  color: string,
): void {
  // Premier sommet indispensable pour amorcer le chemin ferme.
  const firstPoint = points[0];
  if (firstPoint === undefined) return;
  context.beginPath();
  context.moveTo(firstPoint[0], firstPoint[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point !== undefined) context.lineTo(point[0], point[1]);
  }
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

// ----------------------------------------------------------------------------
// Applique un facteur de lumiere aux trois canaux d'une face.
//
// Parametres :
// - red, green, blue : canaux RGB sources entre 0 et 255.
// - factor : facteur d'eclaircissement ou d'assombrissement.
// - opacity : transparence bornee appliquee a la face.
//
// Retour :
// - couleur CSS bornee utilisable directement par le canvas.
// ----------------------------------------------------------------------------
function scaleStreamingColor(
  red: number,
  green: number,
  blue: number,
  factor: number,
  opacity: number,
): string {
  // Opacite protegee avant sa serialisation dans la couleur CSS.
  const boundedOpacity = Math.max(0, Math.min(1, opacity));
  return `rgb(${Math.min(255, Math.round(red * factor))} ${Math.min(255, Math.round(green * factor))} ${Math.min(255, Math.round(blue * factor))} / ${boundedOpacity})`;
}
