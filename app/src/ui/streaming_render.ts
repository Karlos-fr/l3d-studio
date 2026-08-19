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

// Hauteur CSS stable de l'apercu 3D.
const STREAMING_PREVIEW_HEIGHT = 260;

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
    `${state.streaming.movementStepsPerSecond} déplacements/s`,
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
    toggleButton.textContent = state.streaming.active ? "Arrêter" : "Démarrer";
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
  const cssHeight = STREAMING_PREVIEW_HEIGHT;
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

  const centerX = cssWidth / 2;
  const centerY = cssHeight / 2 + 3;
  const projectionScale = Math.min(cssWidth, cssHeight) * 0.105;
  drawStreamingCubeFrame(context, centerX, centerY, projectionScale);

  const projectedVoxels: StreamingPreviewVoxel[] = [];
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        const projected = projectStreamingPoint(
          x,
          y,
          z,
          streamingCameraYaw,
          streamingCameraPitch,
        );
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
  for (const voxel of projectedVoxels) drawStreamingVoxel(context, voxel);

  context.fillStyle = "rgba(226, 232, 240, 0.72)";
  context.font = "12px system-ui";
  context.fillText("Glisser pour tourner", 12, cssHeight - 12);
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
  const cssHeight = STREAMING_PREVIEW_HEIGHT;
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

  const layerWidth = cssWidth / 4;
  const layerHeight = cssHeight / 2;
  const cellSize = Math.min((layerWidth - 20) / STREAM_CUBE_SIDE, 11);
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    const layerColumn = z % 4;
    const layerRow = Math.floor(z / 4);
    const gridWidth = cellSize * STREAM_CUBE_SIDE;
    const originX = layerColumn * layerWidth + (layerWidth - gridWidth) / 2;
    const originY = layerRow * layerHeight + 30;
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
          originX + x * cellSize,
          originY + y * cellSize,
          Math.max(cellSize - 1, 1),
          Math.max(cellSize - 1, 1),
        );
      }
    }
  }
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
// Dessine un repere eteint discret ou un voxel lumineux avec profondeur.
//
// Parametres :
// - context : contexte Canvas courant.
// - voxel : position projetee, profondeur et couleur RGB.
// ----------------------------------------------------------------------------
function drawStreamingVoxel(
  context: CanvasRenderingContext2D,
  voxel: StreamingPreviewVoxel,
): void {
  const intensity = Math.max(voxel.red, voxel.green, voxel.blue);
  const depthFactor = Math.max(0.75, Math.min(1.25, 1 + voxel.depth * 0.035));
  context.beginPath();
  if (intensity === 0) {
    context.fillStyle = "rgba(148, 163, 184, 0.13)";
    context.arc(voxel.screenX, voxel.screenY, 0.75 * depthFactor, 0, Math.PI * 2);
  } else {
    const radius = (2.2 + intensity / 110) * depthFactor;
    context.fillStyle = `rgb(${voxel.red} ${voxel.green} ${voxel.blue})`;
    context.shadowColor = `rgba(${voxel.red}, ${voxel.green}, ${voxel.blue}, 0.65)`;
    context.shadowBlur = 5;
    context.arc(voxel.screenX, voxel.screenY, radius, 0, Math.PI * 2);
  }
  context.fill();
  context.shadowBlur = 0;
}
