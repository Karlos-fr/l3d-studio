// ============================================================================
// Main - Implementation de l'orchestration applicative
// ----------------------------------------------------------------------------
// Ce fichier initialise l'application et connecte les modules UI. Il ne porte
// pas les appels Particle Cloud ni la construction du protocole firmware.
// ============================================================================

import "./styles.css";
import { appendDiagnosticsSample } from "./diagnostics/history";
import { createDiagnosticsMonitor } from "./diagnostics/monitor";
import { readDiagnosticsSample } from "./diagnostics/reader";
import type { DiagnosticsSample } from "./diagnostics/types";
import { createParticleClient } from "./particle/client";
import { createLanClient, LanClientError, normalizeLanHost, normalizeLanPort } from "./lan/client";
import { loadParticleSession } from "./particle/session";
import { attachAppEvents, hydrateAuthenticatedSession } from "./ui/events";
import { loadAppPreferences } from "./ui/preferences";
import { renderApp } from "./ui/render";
import { updateDiagnosticsView } from "./ui/diagnostics_render";
import { createInitialState } from "./ui/state";
import { createStreamingEngine, type StreamingFps } from "./streaming/engine";
import { createStreamingAnimation, getStreamingAnimationLabel } from "./streaming/registry";
import type { StreamingAnimation } from "./streaming/animation";
import type { LanClient } from "./lan/types";
import {
  selectStreamingPreviewMode,
  updateStreamingView,
} from "./ui/streaming_render";
import { assembleBytecodeSource } from "./bytecode/assembler";
import { readBytecodeUint16 } from "./bytecode/crc16";
import { BYTECODE_CRC_OFFSET } from "./bytecode/format";
import {
  createBytecodeLibraryEntry,
  duplicateBytecodeLibraryEntry,
  exportBytecodeLibrary,
  importBytecodeLibrary,
  loadBytecodeLibrary,
  renameBytecodeLibraryEntry,
  saveBytecodeLibrary,
  updateBytecodeLibraryEntry,
  type BytecodeLibraryEntry,
} from "./bytecode/library";
import { BYTECODE_REFERENCE_PROGRAMS } from "./bytecode/reference_programs";
import {
  BytecodeSimulationRunner,
  type BytecodeSimulationSnapshot,
} from "./bytecode/simulation";
import type { StreamingFramebuffer } from "./streaming/framebuffer";
import { serializeRgb332 } from "./streaming/serializer";
import {
  loadPainterFramebuffer,
  paintVoxel,
  savePainterFramebuffer,
  type PainterTool,
} from "./painting/model";
import { PainterFrameSender } from "./painting/sender";
import type { StreamingWorkspace } from "./ui/state";
import { validateBytecodeContainer } from "./bytecode/validator";
import {
  updateBytecodePreview,
  updateBytecodeSimulationView,
} from "./ui/bytecode_render";

// Identifiant du conteneur DOM racine fourni par index.html.
const APP_ROOT_ID = "app";

// Identifiant firmware stable du mode Stream.
const STREAM_MODE_ID = 76;

// Attente apres le dernier mouvement du slider avant la commande Photon.
const STREAMING_BRIGHTNESS_DEBOUNCE_MS = 150;

// ----------------------------------------------------------------------------
// Initialise L3D Studio dans le conteneur DOM principal.
//
// Effet de bord :
// - lit le document courant, injecte le rendu initial et branche les evenements
//   utilisateur de la coquille applicative.
// ----------------------------------------------------------------------------
function bootstrapApplication(): void {
  const rootElement = document.getElementById(APP_ROOT_ID);

  if (rootElement === null) {
    throw new Error("Le conteneur principal de l'application est introuvable.");
  }

  const mountedRootElement = rootElement;

  // Derniere largeur traitee afin d'eviter une boucle de ResizeObserver.
  let previousDiagnosticsWidth = 0;

  const session = loadParticleSession(window.localStorage);
  const preferences = loadAppPreferences(window.localStorage);
  const particleClient = createParticleClient({
    token: session?.accessToken,
  });
  const state = createInitialState(session, preferences);
  state.bytecode.library = loadBytecodeLibrary(window.localStorage);

  // Framebuffer du peintre restaure independamment de l'animation courante.
  const painterFramebuffer = loadPainterFramebuffer(window.localStorage);

  // ----------------------------------------------------------------------------
  // Synchronise une tranche de simulation avec l'etat et l'apercu existants.
  //
  // Parametres :
  // - snapshot : compteurs et etat produits par la VM locale.
  // - framebuffer : derniere frame RGB a afficher.
  //
  // Effet de bord :
  // - remplace les statistiques procedurales et redessine leur seul panneau.
  // ----------------------------------------------------------------------------
  function handleBytecodeSimulationUpdate(
    snapshot: BytecodeSimulationSnapshot,
    framebuffer: StreamingFramebuffer,
  ): void {
    state.bytecode.simulation = snapshot;
    updateBytecodeSimulationView(mountedRootElement, state, framebuffer);
  }

  // Simulateur unique conserve pendant tous les rerendus de l'editeur.
  const bytecodeSimulation = new BytecodeSimulationRunner({
    onUpdate: handleBytecodeSimulationUpdate,
  });

  // Client LAN propre a la session de streaming courante.
  let streamingLanClient: LanClient | null = null;

  // File bornee qui regroupe les coups de pinceau sans POST concurrents.
  const painterFrameSender = new PainterFrameSender(
    sendPainterFrame,
    handlePainterSendError,
  );

  // Derniere luminosite a appliquer apres la frame HTTP actuellement en cours.
  let pendingStreamingBrightness: number | null = null;

  // Temporisation qui regroupe les nombreux evenements produits par le slider.
  let streamingBrightnessTimer: number | null = null;

  // Animation creee depuis le registre et remplacable sans recreer le moteur.
  let activeStreamingAnimation: StreamingAnimation = createStreamingAnimation(
    state.streaming.selectedAnimationId,
  );
  const streamingEngine = createStreamingEngine({
    animation: activeStreamingAnimation,
    sendFrame: async (frame, signal) => {
      if (streamingLanClient === null) {
        throw new Error("Aucune destination LAN n'est configurée pour le streaming.");
      }
      await streamingLanClient.streamFrame(frame, signal);
      if (pendingStreamingBrightness !== null) {
        const brightnessPercent = pendingStreamingBrightness;
        pendingStreamingBrightness = null;
        try {
          await streamingLanClient.mode(`B:${brightnessPercent},`);
        } catch {
          // Une prochaine manipulation du slider pourra retenter sans couper
          // le streaming ni transformer cette commande annexe en erreur fatale.
        }
      }
    },
    onFrame: (framebuffer) => updateStreamingView(mountedRootElement, state, framebuffer),
    onStats: (stats) => {
      Object.assign(state.streaming, stats);
      updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
    },
    onError: handleStreamingError,
  });

  // ----------------------------------------------------------------------------
  // Retourne le framebuffer correspondant a l'atelier visible.
  //
  // Retour :
  // - dessin local ou frame courante de l'animation web.
  // ----------------------------------------------------------------------------
  function getStreamingPreviewFramebuffer(): StreamingFramebuffer {
    return state.streaming.workspace === "painting"
      ? painterFramebuffer
      : streamingEngine.getFramebuffer();
  }

  // ----------------------------------------------------------------------------
  // Envoie une frame differee par la route de peinture du client courant.
  //
  // Parametres :
  // - frame : payload RGB332 complet produit par la file bornee.
  //
  // Effet de bord :
  // - execute un POST LAN sans nouvelle tentative automatique.
  // ----------------------------------------------------------------------------
  async function sendPainterFrame(frame: Uint8Array): Promise<void> {
    if (streamingLanClient === null) {
      throw new Error("Aucune destination LAN n'est configurée pour la peinture.");
    }
    await streamingLanClient.painterFrame(frame);
  }

  // ----------------------------------------------------------------------------
  // Arrete la session lorsqu'un envoi differe du peintre echoue.
  //
  // Parametres :
  // - error : erreur reseau ou de protocole recue par la file.
  //
  // Effet de bord :
  // - desactive les futurs envois et actualise uniquement le panneau visible.
  // ----------------------------------------------------------------------------
  function handlePainterSendError(error: unknown): void {
    painterFrameSender.disable();
    state.streaming.active = false;
    streamingLanClient = null;
    state.streaming.statusMessage = error instanceof LanClientError
      ? "Peinture interrompue : vérifie l'adresse LAN et le firmware du Photon."
      : error instanceof Error
        ? `Peinture interrompue : ${error.message}`
        : "Peinture interrompue par une erreur inconnue.";
    state.statusMessage = state.streaming.statusMessage;
    updateStreamingView(mountedRootElement, state, painterFramebuffer);
  }

  // ----------------------------------------------------------------------------
  // Convertit un echec de streaming en instruction directement exploitable.
  //
  // Parametres :
  // - error : erreur reseau ou de protocole recue par le moteur.
  //
  // Effet de bord :
  // - arrete la session et actualise uniquement son panneau.
  // ----------------------------------------------------------------------------
  function handleStreamingError(error: unknown): void {
    state.streaming.active = false;
    state.streaming.statusMessage = error instanceof LanClientError
      ? "Streaming interrompu : vérifie l'adresse LAN, le port 8080 et le firmware du Photon."
      : error instanceof Error
        ? `Streaming interrompu : ${error.message}`
        : "Streaming interrompu par une erreur inconnue.";
    state.statusMessage = state.streaming.statusMessage;
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Applique les reglages modifiables pendant une session active.
  //
  // Effet de bord :
  // - modifie immediatement la vitesse locale ;
  // - remplace la luminosite en attente, envoyee apres la prochaine frame.
  // ----------------------------------------------------------------------------
  function updateStreamingSettings(): void {
    activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
    if (state.streaming.active && streamingLanClient !== null) {
      if (streamingBrightnessTimer !== null) {
        window.clearTimeout(streamingBrightnessTimer);
      }
      streamingBrightnessTimer = window.setTimeout(() => {
        streamingBrightnessTimer = null;
        if (state.streaming.active && streamingLanClient !== null) {
          pendingStreamingBrightness = state.streaming.brightnessPercent;
        }
      }, STREAMING_BRIGHTNESS_DEBOUNCE_MS);
    }
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Selectionne une animation du registre sans interrompre une session active.
  //
  // Parametres :
  // - animationId : identifiant stable choisi dans l'interface.
  //
  // Effet de bord :
  // - remplace l'animation et remet uniquement sa timeline a zero.
  // ----------------------------------------------------------------------------
  function selectStreamingAnimation(animationId: string): void {
    state.streaming.selectedAnimationId = animationId;
    activeStreamingAnimation = createStreamingAnimation(animationId);
    activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
    streamingEngine.setAnimation(activeStreamingAnimation);
    state.streaming.statusMessage = state.streaming.active
      ? `${getStreamingAnimationLabel(animationId)} en cours.`
      : `${getStreamingAnimationLabel(animationId)} sélectionné.`;
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Applique une nouvelle cadence sans interrompre la session courante.
  //
  // Effet de bord :
  // - modifie l'intervalle du moteur actif sans reinitialiser la sphere.
  // ----------------------------------------------------------------------------
  function updateStreamingCadence(): void {
    if (state.streaming.active) {
      streamingEngine.setTargetFps(state.streaming.targetFps);
      return;
    }
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Selectionne Stream puis envoie le dessin courant en mode maintenu.
  //
  // Effet de bord :
  // - ouvre le client LAN, confirme le mode 76 et active la file du peintre.
  // ----------------------------------------------------------------------------
  async function startPainting(): Promise<void> {
    try {
      state.isBusy = true;
      const host = normalizeLanHost(state.lanHost);
      const port = normalizeLanPort(state.lanPort);
      streamingLanClient = createLanClient({ host, port });
      state.streaming.statusMessage = "Activation du mode peinture...";
      rerender();
      await streamingLanClient.mode(
        `M:Stream,S:0,B:${state.streaming.brightnessPercent},`,
      );
      const streamState = await streamingLanClient.state();
      if (streamState.modeId !== STREAM_MODE_ID) {
        throw new Error("Le Photon n'a pas confirmé l'activation du mode Stream.");
      }
      await streamingLanClient.painterFrame(serializeRgb332(painterFramebuffer));
      painterFrameSender.enable();
      state.streaming.active = true;
      state.streaming.statusMessage = "Dessin affiché sur le cube.";
      state.lastTransportUsed = "lan";
      state.currentModeName = "Stream";
      state.isBusy = false;
      rerender();
    } catch (error) {
      state.isBusy = false;
      painterFrameSender.disable();
      streamingLanClient = null;
      handlePainterSendError(error);
      rerender();
    }
  }

  // ----------------------------------------------------------------------------
  // Selectionne le mode Stream puis lance la cadence du navigateur.
  //
  // Parametres :
  // - targetFps : cadence bornee choisie dans l'interface.
  //
  // Effet de bord :
  // - appelle le Photon sur le LAN et demarre le moteur apres confirmation.
  // ----------------------------------------------------------------------------
  async function startStreaming(targetFps: StreamingFps): Promise<void> {
    if (state.streaming.workspace === "painting") {
      await startPainting();
      return;
    }
    try {
      state.isBusy = true;
      const host = normalizeLanHost(state.lanHost);
      const port = normalizeLanPort(state.lanPort);
      streamingLanClient = createLanClient({ host, port });
      state.streaming.statusMessage = "Activation du mode Stream...";
      rerender();
      activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
      pendingStreamingBrightness = null;
      if (streamingBrightnessTimer !== null) {
        window.clearTimeout(streamingBrightnessTimer);
        streamingBrightnessTimer = null;
      }
      await streamingLanClient.mode(
        `M:Stream,S:0,B:${state.streaming.brightnessPercent},`,
      );
      const streamState = await streamingLanClient.state();
      if (streamState.modeId !== STREAM_MODE_ID) {
        throw new Error("Le Photon n'a pas confirmé l'activation du mode Stream.");
      }
      state.lastTransportUsed = "lan";
      state.currentModeName = "Stream";
      state.streaming.statusMessage = `${getStreamingAnimationLabel(state.streaming.selectedAnimationId)} en cours.`;
      state.isBusy = false;
      streamingEngine.start(targetFps);
      rerender();
    } catch (error) {
      state.isBusy = false;
      streamingLanClient = null;
      handleStreamingError(error);
      rerender();
    }
  }

  // ----------------------------------------------------------------------------
  // Arrete les frames et demande au cube de revenir au mode Off.
  //
  // Parametres :
  // - returnToOff : demande Off sauf lorsqu'une animation native va suivre.
  //
  // Effet de bord :
  // - annule requestAnimationFrame et le POST actif avant toute commande finale.
  // ----------------------------------------------------------------------------
  function stopStreaming(returnToOff = true): void {
    const wasActive = state.streaming.active;
    const wasPainting = state.streaming.workspace === "painting";
    streamingEngine.stop();
    painterFrameSender.disable();
    state.streaming.active = false;
    state.streaming.statusMessage = wasPainting ? "Peinture arrêtée." : "Streaming arrêté.";
    if (returnToOff && wasActive && streamingLanClient !== null) {
      void streamingLanClient.mode("M:Off,S:0,B:1,").catch(() => {
        // Le timeout firmware ramene egalement le cube a Off si cette commande echoue.
      });
    }
    streamingLanClient = null;
    pendingStreamingBrightness = null;
    if (streamingBrightnessTimer !== null) {
      window.clearTimeout(streamingBrightnessTimer);
      streamingBrightnessTimer = null;
    }
    updateStreamingView(mountedRootElement, state, getStreamingPreviewFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Selectionne l'atelier d'animation ou de peinture.
  //
  // Parametres :
  // - workspace : atelier demande par son onglet.
  //
  // Effet de bord :
  // - arrete une session active, choisit une vue adaptee et reconstruit le panneau.
  // ----------------------------------------------------------------------------
  function selectStreamingWorkspace(workspace: StreamingWorkspace): void {
    if (workspace === state.streaming.workspace) return;
    if (state.streaming.active) stopStreaming();
    state.streaming.workspace = workspace;
    state.streaming.statusMessage = workspace === "painting"
      ? "Brouillon prêt. Affiche-le sur le cube quand tu le souhaites."
      : "Streaming arrêté.";
    selectStreamingPreviewMode(workspace === "painting" ? "layers" : "3d");
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Selectionne le crayon ou la gomme sans modifier le dessin.
  //
  // Parametres :
  // - tool : outil demande par l'utilisateur.
  // ----------------------------------------------------------------------------
  function selectPainterTool(tool: PainterTool): void {
    state.streaming.painterTool = tool;
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Persiste le brouillon courant en signalant un stockage indisponible.
  //
  // Retour :
  // - vrai lorsque localStorage a accepte le dessin.
  // ----------------------------------------------------------------------------
  function persistPainterFramebuffer(): boolean {
    try {
      savePainterFramebuffer(window.localStorage, painterFramebuffer);
      return true;
    } catch {
      state.streaming.statusMessage = "Dessin modifié, mais son stockage local a échoué.";
      return false;
    }
  }

  // ----------------------------------------------------------------------------
  // Applique l'outil courant a un voxel de la vue par couches.
  //
  // Parametres :
  // - x, y, z : coordonnees logiques choisies par le pointeur.
  //
  // Effet de bord :
  // - modifie et sauvegarde le brouillon puis programme son envoi si actif.
  // ----------------------------------------------------------------------------
  function paintStreamingVoxel(x: number, y: number, z: number): void {
    if (state.isBusy) return;
    const changed = paintVoxel(
      painterFramebuffer,
      x,
      y,
      z,
      state.streaming.painterColor,
      state.streaming.painterTool,
    );
    if (!changed) return;
    persistPainterFramebuffer();
    painterFrameSender.schedule(painterFramebuffer);
    updateStreamingView(mountedRootElement, state, painterFramebuffer);
  }

  // ----------------------------------------------------------------------------
  // Efface, sauvegarde et eventuellement envoie le dessin complet.
  //
  // Effet de bord :
  // - met les 512 voxels a noir sans modifier l'outil courant.
  // ----------------------------------------------------------------------------
  function clearPainter(): void {
    painterFramebuffer.clear();
    persistPainterFramebuffer();
    painterFrameSender.schedule(painterFramebuffer);
    updateStreamingView(mountedRootElement, state, painterFramebuffer);
  }

  // ----------------------------------------------------------------------------
  // Retourne l'entree locale actuellement selectionnee.
  //
  // Retour :
  // - entree correspondante ou null pour un exemple integre.
  // ----------------------------------------------------------------------------
  function getSelectedBytecodeLibraryEntry(): BytecodeLibraryEntry | null {
    if (!state.bytecode.selectedSourceKey.startsWith("library:")) return null;
    const identifier = state.bytecode.selectedSourceKey.slice("library:".length);
    return state.bytecode.library.find((entry) => entry.id === identifier) ?? null;
  }

  // ----------------------------------------------------------------------------
  // Invalide le dernier binaire lorsqu'une source est modifiee.
  // ----------------------------------------------------------------------------
  function invalidateBytecodeCompilation(): void {
    state.bytecode.compiledContainer = null;
    state.bytecode.compiledSize = 0;
    state.bytecode.compiledCapabilities = 0;
    state.bytecode.compileMessage = "Source modifiée : compile-la avant la simulation ou l'installation.";
    bytecodeSimulation.stop();
  }

  // ----------------------------------------------------------------------------
  // Selectionne un exemple ou une entree locale par sa cle stable.
  //
  // Parametres :
  // - sourceKey : cle `example:` ou `library:` choisie.
  // ----------------------------------------------------------------------------
  function selectBytecodeSource(sourceKey: string): void {
    if (sourceKey.startsWith("example:")) {
      const identifier = sourceKey.slice("example:".length);
      const example = BYTECODE_REFERENCE_PROGRAMS.find((program) => program.id === identifier);
      if (example === undefined) return;
      state.bytecode.selectedSourceKey = sourceKey;
      state.bytecode.sourceName = identifier === "sphere"
        ? "Sphère"
        : identifier.charAt(0).toUpperCase() + identifier.slice(1);
      state.bytecode.sourceText = example.source;
    } else if (sourceKey.startsWith("library:")) {
      const identifier = sourceKey.slice("library:".length);
      const entry = state.bytecode.library.find((candidate) => candidate.id === identifier);
      if (entry === undefined) return;
      state.bytecode.selectedSourceKey = sourceKey;
      state.bytecode.sourceName = entry.name;
      state.bytecode.sourceText = entry.source;
    } else {
      return;
    }
    invalidateBytecodeCompilation();
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Compile la source courante et charge la VM locale.
  // ----------------------------------------------------------------------------
  function compileCurrentBytecodeSource(): void {
    try {
      const assembled = assembleBytecodeSource(state.bytecode.sourceText);
      state.bytecode.compiledContainer = assembled.container;
      state.bytecode.compiledSize = assembled.container.length;
      state.bytecode.compiledCapabilities = assembled.capabilities;
      state.bytecode.compileMessage = `Compilation réussie : ${assembled.payload.length} octets d'instructions.`;
      bytecodeSimulation.load(assembled.container);
    } catch (error) {
      state.bytecode.compiledContainer = null;
      state.bytecode.compiledSize = 0;
      state.bytecode.compiledCapabilities = 0;
      state.bytecode.compileMessage = error instanceof Error
        ? `Erreur de compilation : ${error.message}`
        : "Erreur de compilation inconnue.";
    }
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Persiste la source courante, en creation ou en mise a jour.
  // ----------------------------------------------------------------------------
  function saveCurrentBytecodeSource(): void {
    try {
      const selected = getSelectedBytecodeLibraryEntry();
      if (selected === null) {
        const created = createBytecodeLibraryEntry(
          state.bytecode.sourceName,
          state.bytecode.sourceText,
        );
        state.bytecode.library.push(created);
        state.bytecode.selectedSourceKey = `library:${created.id}`;
      } else {
        const updated = updateBytecodeLibraryEntry(
          renameBytecodeLibraryEntry(selected, state.bytecode.sourceName),
          state.bytecode.sourceText,
        );
        state.bytecode.library = state.bytecode.library.map((entry) =>
          entry.id === updated.id ? updated : entry
        );
      }
      saveBytecodeLibrary(window.localStorage, state.bytecode.library);
      state.bytecode.operationMessage = "Source enregistrée dans ce navigateur.";
    } catch (error) {
      state.bytecode.operationMessage = error instanceof Error ? error.message : "Enregistrement impossible.";
    }
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Cree une copie locale de l'entree selectionnee.
  // ----------------------------------------------------------------------------
  function duplicateCurrentBytecodeSource(): void {
    const selected = getSelectedBytecodeLibraryEntry();
    if (selected === null) return;
    const duplicate = duplicateBytecodeLibraryEntry(selected);
    state.bytecode.library.push(duplicate);
    saveBytecodeLibrary(window.localStorage, state.bytecode.library);
    selectBytecodeSource(`library:${duplicate.id}`);
  }

  // ----------------------------------------------------------------------------
  // Renomme l'entree selectionnee apres une saisie utilisateur explicite.
  // ----------------------------------------------------------------------------
  function renameCurrentBytecodeSource(): void {
    const selected = getSelectedBytecodeLibraryEntry();
    if (selected === null) return;
    const requestedName = window.prompt("Nouveau nom de l'animation :", selected.name);
    if (requestedName === null) return;
    try {
      const renamed = renameBytecodeLibraryEntry(selected, requestedName);
      state.bytecode.library = state.bytecode.library.map((entry) =>
        entry.id === renamed.id ? renamed : entry
      );
      state.bytecode.sourceName = renamed.name;
      saveBytecodeLibrary(window.localStorage, state.bytecode.library);
    } catch (error) {
      state.bytecode.operationMessage = error instanceof Error ? error.message : "Nom invalide.";
    }
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Supprime l'entree locale apres confirmation.
  // ----------------------------------------------------------------------------
  function deleteCurrentBytecodeSource(): void {
    const selected = getSelectedBytecodeLibraryEntry();
    if (selected === null || !window.confirm(`Supprimer « ${selected.name} » de ce navigateur ?`)) return;
    state.bytecode.library = state.bytecode.library.filter((entry) => entry.id !== selected.id);
    saveBytecodeLibrary(window.localStorage, state.bytecode.library);
    selectBytecodeSource("example:rain");
  }

  // ----------------------------------------------------------------------------
  // Telecharge une archive JSON limitee aux sources locales.
  // ----------------------------------------------------------------------------
  function exportCurrentBytecodeLibrary(): void {
    const serialized = exportBytecodeLibrary(state.bytecode.library);
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "l3d-animations.json";
    anchor.click();
    URL.revokeObjectURL(url);
    state.bytecode.operationMessage = "Bibliothèque exportée sans configuration ni token Particle.";
    rerender();
  }

  // ----------------------------------------------------------------------------
  // Cree un client bytecode exclusivement depuis l'adresse LAN configuree.
  //
  // Retour :
  // - client local sans strategie de repli.
  // ----------------------------------------------------------------------------
  function createBytecodeLanClient(): LanClient {
    return createLanClient({
      host: normalizeLanHost(state.lanHost),
      port: normalizeLanPort(state.lanPort),
    });
  }

  // ----------------------------------------------------------------------------
  // Execute une operation LAN procedurale avec statut et erreur visibles.
  //
  // Parametres :
  // - progressMessage : message affiche avant l'appel.
  // - operation : appel LAN a executer.
  // ----------------------------------------------------------------------------
  async function runBytecodeLanOperation(
    progressMessage: string,
    operation: (client: LanClient) => Promise<void>,
  ): Promise<void> {
    state.isBusy = true;
    state.bytecode.operationMessage = progressMessage;
    rerender();
    try {
      await operation(createBytecodeLanClient());
      state.lastTransportUsed = "lan";
    } catch (error) {
      state.bytecode.operationMessage = error instanceof Error ? error.message : "Erreur LAN inconnue.";
    } finally {
      state.isBusy = false;
      rerender();
    }
  }

  // ----------------------------------------------------------------------------
  // Route les actions declaratives de l'atelier procedural.
  //
  // Parametres :
  // - action : nom complet `bytecode-*` issu du DOM.
  // ----------------------------------------------------------------------------
  async function handleBytecodeAction(action: string): Promise<void> {
    if (action === "bytecode-compile") compileCurrentBytecodeSource();
    else if (action === "bytecode-save") saveCurrentBytecodeSource();
    else if (action === "bytecode-duplicate") duplicateCurrentBytecodeSource();
    else if (action === "bytecode-rename") renameCurrentBytecodeSource();
    else if (action === "bytecode-delete-source") deleteCurrentBytecodeSource();
    else if (action === "bytecode-export") exportCurrentBytecodeLibrary();
    else if (action === "bytecode-sim-start") bytecodeSimulation.start();
    else if (action === "bytecode-sim-pause") bytecodeSimulation.pause();
    else if (action === "bytecode-sim-stop") bytecodeSimulation.stop();
    else if (action === "bytecode-sim-reset") bytecodeSimulation.resetSeed();
    else if (action === "bytecode-read") {
      await runBytecodeLanOperation("Lecture du stockage bytecode...", async (client) => {
        state.bytecode.photonStatus = await client.bytecodeStatus();
        state.bytecode.operationMessage = state.bytecode.photonStatus.installed
          ? "Programme installé relu avec succès."
          : "Aucun programme procédural installé.";
      });
    } else if (action === "bytecode-install") {
      const compiled = state.bytecode.compiledContainer;
      if (compiled === null) return;
      await runBytecodeLanOperation("Vérification du Photon...", async (client) => {
        const currentStatus = await client.bytecodeStatus();
        if (currentStatus.installed && !window.confirm(
          `Remplacer le programme installé (CRC 0x${currentStatus.crc.toString(16).toUpperCase().padStart(4, "0")}) ?`,
        )) {
          state.bytecode.operationMessage = "Installation annulée.";
          return;
        }
        state.bytecode.operationMessage = "Écriture de la banque inactive...";
        rerender();
        const installedStatus = await client.installBytecode(compiled);
        const reloaded = await client.bytecodeProgram();
        const validation = validateBytecodeContainer(reloaded);
        const reloadedCrc = readBytecodeUint16(reloaded, BYTECODE_CRC_OFFSET);
        if (!validation.valid || reloadedCrc !== installedStatus.crc) {
          throw new Error("Le CRC relu après installation ne correspond pas.");
        }
        state.bytecode.photonStatus = installedStatus;
        state.bytecode.operationMessage = `Installation confirmée, CRC 0x${reloadedCrc.toString(16).toUpperCase().padStart(4, "0")}.`;
      });
    } else if (action === "bytecode-run") {
      await runBytecodeLanOperation("Lancement du programme installé...", async (client) => {
        await client.runBytecode();
        state.currentModeName = "L3DProgram";
        state.bytecode.operationMessage = "Animation procédurale lancée sur le cube.";
      });
    } else if (action === "bytecode-stop") {
      await runBytecodeLanOperation("Arrêt du programme...", async (client) => {
        await client.stopBytecode();
        state.currentModeName = "Off";
        state.bytecode.operationMessage = "Animation procédurale arrêtée.";
      });
    } else if (action === "bytecode-delete-program" && window.confirm(
      "Supprimer le programme procédural installé sur le Photon ?",
    )) {
      await runBytecodeLanOperation("Suppression du programme...", async (client) => {
        state.bytecode.photonStatus = await client.deleteBytecode();
        state.bytecode.operationMessage = "Programme supprimé du Photon.";
      });
    }
  }

  // ----------------------------------------------------------------------------
  // Traite les champs de l'editeur et l'import de bibliotheque.
  //
  // Parametres :
  // - fieldElement : champ DOM modifie.
  // - commitChange : vrai lors de la validation finale du champ.
  // ----------------------------------------------------------------------------
  async function handleBytecodeField(
    fieldElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    commitChange: boolean,
  ): Promise<void> {
    const fieldName = fieldElement.dataset.field;
    if (fieldName === "bytecode-source-select" && commitChange) {
      selectBytecodeSource(fieldElement.value);
    } else if (fieldName === "bytecode-source") {
      state.bytecode.sourceText = fieldElement.value;
      invalidateBytecodeCompilation();
    } else if (fieldName === "bytecode-source-name") {
      state.bytecode.sourceName = fieldElement.value;
    } else if (
      fieldName === "bytecode-import" && commitChange &&
      fieldElement instanceof HTMLInputElement && fieldElement.files?.[0] !== undefined
    ) {
      try {
        const imported = importBytecodeLibrary(await fieldElement.files[0].text());
        state.bytecode.library = imported;
        saveBytecodeLibrary(window.localStorage, imported);
        state.bytecode.operationMessage = `${imported.length} source(s) importée(s).`;
        if (imported[0] !== undefined) selectBytecodeSource(`library:${imported[0].id}`);
        else rerender();
      } catch (error) {
        state.bytecode.operationMessage = error instanceof Error ? error.message : "Import impossible.";
        rerender();
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Integre un nouvel echantillon puis actualise uniquement le panneau concerne.
  //
  // Parametres :
  // - sample : echantillon commun retourne par le transport actif.
  //
  // Effet de bord :
  // - enrichit l'historique et remplace la zone vivante des diagnostics.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsSample(sample: DiagnosticsSample): void {
    appendDiagnosticsSample(state.diagnostics, sample);
    state.lastTransportUsed = sample.source;
    updateDiagnosticsView(mountedRootElement, state);
  }

  // ----------------------------------------------------------------------------
  // Conserve le dernier echec de collecte sans effacer les donnees valides.
  //
  // Parametres :
  // - error : erreur recue par le moniteur.
  // - consecutiveErrors : nombre d'echecs consecutifs courant.
  //
  // Effet de bord :
  // - met a jour le message d'erreur dans la seule zone Diagnostics.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsError(error: unknown, consecutiveErrors: number): void {
    state.diagnostics.lastError =
      error instanceof Error ? error.message : "Erreur de diagnostic inconnue.";
    state.diagnostics.consecutiveErrors = consecutiveErrors;
    updateDiagnosticsView(mountedRootElement, state);
  }

  const diagnosticsMonitor = createDiagnosticsMonitor({
    readSample: readCurrentDiagnosticsSample,
    onSample: handleDiagnosticsSample,
    onError: handleDiagnosticsError,
  });

  // ----------------------------------------------------------------------------
  // Lit un echantillon avec l'etat et le client Particle courants.
  //
  // Retour :
  // - promesse du prochain echantillon de diagnostics.
  //
  // Effet de bord :
  // - appelle le transport LAN ou Particle configure.
  // ----------------------------------------------------------------------------
  function readCurrentDiagnosticsSample(): Promise<DiagnosticsSample> {
    return readDiagnosticsSample(state, particleClient);
  }

  // ----------------------------------------------------------------------------
  // Relance le rendu et rebranche les evenements sur le DOM remplace.
  //
  // Effet de bord :
  // - remplace l'interface courante et ajoute les gestionnaires d'evenements.
  // ----------------------------------------------------------------------------
  function rerender(): void {
    renderApp(mountedRootElement, state);
    attachAppEvents({
      rootElement: mountedRootElement,
      state,
      particleClient,
      diagnosticsMonitor,
      storage: window.localStorage,
      rerender,
      startStreaming,
      selectStreamingAnimation,
      updateStreamingCadence,
      updateStreamingSettings,
      stopStreaming,
      selectStreamingWorkspace,
      selectPainterTool,
      paintStreamingVoxel,
      clearPainter,
      handleBytecodeAction,
      handleBytecodeField,
    });
    updateStreamingView(mountedRootElement, state, getStreamingPreviewFramebuffer());
    updateBytecodePreview(mountedRootElement, bytecodeSimulation.framebuffer);
  }

  // ----------------------------------------------------------------------------
  // Recalcule les SVG lorsque la largeur disponible change reellement.
  //
  // Parametres :
  // - _entries : notifications de redimensionnement emises par le navigateur.
  //
  // Effet de bord :
  // - actualise seulement les graphiques et ne lance aucune collecte reseau.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsResize(_entries: ResizeObserverEntry[]): void {
    const currentWidth = mountedRootElement.clientWidth;
    if (currentWidth === previousDiagnosticsWidth) return;
    previousDiagnosticsWidth = currentWidth;
    updateDiagnosticsView(mountedRootElement, state);
  }

  // Observateur unique de la racine conserve pendant toute la vie de l'app.
  const diagnosticsResizeObserver = new ResizeObserver(handleDiagnosticsResize);
  diagnosticsResizeObserver.observe(mountedRootElement);

  rerender();
  void hydrateAuthenticatedSession({
    rootElement: mountedRootElement,
    state,
    particleClient,
    diagnosticsMonitor,
    storage: window.localStorage,
    rerender,
    startStreaming,
    selectStreamingAnimation,
    updateStreamingCadence,
    updateStreamingSettings,
    stopStreaming,
    selectStreamingWorkspace,
    selectPainterTool,
    paintStreamingVoxel,
    clearPainter,
    handleBytecodeAction,
    handleBytecodeField,
  });
}

bootstrapApplication();
