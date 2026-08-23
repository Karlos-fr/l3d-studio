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
  red: number;
  green: number;
  blue: number;
}

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
  const pixelRatio = window.devicePixelRatio || 1;
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

  // Liste triee en profondeur afin de masquer correctement les faces arriere.
  const projectedVoxels: StreamingPreviewVoxel[] = [];
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        // Position isometrique de ce voxel pour l'orientation courante.
        const projected = projectStreamingPoint(
          x,
          y,
          z,
          streamingCameraYaw,
          streamingCameraPitch,
        );
        // Couleur logique conservee avant l'application de l'eclairage des faces.
        const [red, green, blue] = framebuffer.getVoxel(x, y, z);
        projectedVoxels.push({
          screenX: centerX + projected.horizontal * projectionScale,
          screenY: centerY - projected.vertical * projectionScale,
          depth: projected.depth,
          red,
          green,
          blue,
        });
      }
    }
  }
  projectedVoxels.sort((left, right) => left.depth - right.depth);
  for (const voxel of projectedVoxels) {
    drawStreamingVoxel(context, voxel, projectionScale * 0.31);
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
  const pixelRatio = window.devicePixelRatio || 1;
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
// Dessine un voxel cubique eteint ou lumineux avec trois faces ombrees.
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
  // Demi-largeur de la face superieure du voxel.
  const halfWidth = size * depthFactor;
  // Demi-hauteur isometrique de la face superieure.
  const halfHeight = halfWidth * 0.58;
  // Hauteur des deux faces verticales visibles.
  const bodyHeight = halfWidth * 1.08;
  // Canal rouge assombri utilise pour un voxel eteint.
  const red = intensity === 0 ? 18 : voxel.red;
  // Canal vert assombri utilise pour un voxel eteint.
  const green = intensity === 0 ? 37 : voxel.green;
  // Canal bleu assombri utilise pour un voxel eteint.
  const blue = intensity === 0 ? 72 : voxel.blue;
  if (intensity > 0) {
    context.shadowColor = `rgba(${red}, ${green}, ${blue}, 0.42)`;
    context.shadowBlur = 3.5;
  }
  drawStreamingVoxelFace(
    context,
    [
      [voxel.screenX, voxel.screenY - halfHeight],
      [voxel.screenX + halfWidth, voxel.screenY],
      [voxel.screenX, voxel.screenY + halfHeight],
      [voxel.screenX - halfWidth, voxel.screenY],
    ],
    scaleStreamingColor(red, green, blue, intensity === 0 ? 0.75 : 1.2),
  );
  context.shadowBlur = 0;
  drawStreamingVoxelFace(
    context,
    [
      [voxel.screenX - halfWidth, voxel.screenY],
      [voxel.screenX, voxel.screenY + halfHeight],
      [voxel.screenX, voxel.screenY + halfHeight + bodyHeight],
      [voxel.screenX - halfWidth, voxel.screenY + bodyHeight],
    ],
    scaleStreamingColor(red, green, blue, intensity === 0 ? 0.42 : 0.68),
  );
  drawStreamingVoxelFace(
    context,
    [
      [voxel.screenX + halfWidth, voxel.screenY],
      [voxel.screenX, voxel.screenY + halfHeight],
      [voxel.screenX, voxel.screenY + halfHeight + bodyHeight],
      [voxel.screenX + halfWidth, voxel.screenY + bodyHeight],
    ],
    scaleStreamingColor(red, green, blue, intensity === 0 ? 0.55 : 0.84),
  );
}

// ----------------------------------------------------------------------------
// Remplit une face polygonale d'un voxel projete.
//
// Parametres :
// - context : contexte Canvas courant.
// - points : quatre sommets dans leur ordre de parcours.
// - color : couleur CSS deja ombree pour cette face.
// ----------------------------------------------------------------------------
function drawStreamingVoxelFace(
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  color: string,
): void {
  // Premier sommet indispensable pour amorcer le chemin Canvas.
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
  context.strokeStyle = "rgba(255, 255, 255, 0.055)";
  context.lineWidth = 0.45;
  context.stroke();
}

// ----------------------------------------------------------------------------
// Applique un facteur de lumiere aux trois canaux d'une face.
//
// Parametres :
// - red, green, blue : canaux RGB sources entre 0 et 255.
// - factor : facteur d'eclaircissement ou d'assombrissement.
//
// Retour :
// - couleur CSS bornee utilisable directement par le canvas.
// ----------------------------------------------------------------------------
function scaleStreamingColor(
  red: number,
  green: number,
  blue: number,
  factor: number,
): string {
  return `rgb(${Math.min(255, Math.round(red * factor))} ${Math.min(255, Math.round(green * factor))} ${Math.min(255, Math.round(blue * factor))})`;
}
