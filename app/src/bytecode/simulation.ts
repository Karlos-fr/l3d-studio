// ============================================================================
// BytecodeSimulation - Cadence de la VM TypeScript pour l'apercu procedural
// ----------------------------------------------------------------------------
// Ce module pilote uniquement la VM de reference et un framebuffer web. Il ne
// connait ni l'editeur, ni localStorage, ni le transport LAN.
// ============================================================================

import { BytecodeReferenceVm } from "./reference_vm";
import { StreamingFramebuffer } from "../streaming/framebuffer";

// Graine initiale partagee avec le firmware.
export const BYTECODE_SIMULATION_DEFAULT_SEED = 0x6D2B79F5;

// Cadence d'affichage cible de l'apercu local.
const BYTECODE_SIMULATION_FRAME_INTERVAL_MS = 1000 / 30;

// Etat public transmis a l'interface apres chaque passage.
export interface BytecodeSimulationSnapshot {
  state: "stopped" | "running" | "paused" | "halted" | "fault";
  instructionCount: number;
  shownFrames: number;
  measuredFps: number;
  lastFault: number | null;
}

// Options injectees pour rendre la cadence testable hors navigateur.
export interface BytecodeSimulationOptions {
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => number;
  cancel?: (timerId: number) => void;
  onUpdate: (snapshot: BytecodeSimulationSnapshot, framebuffer: StreamingFramebuffer) => void;
}

// ----------------------------------------------------------------------------
// Lit l'horloge monotone du navigateur utilisee par la simulation.
//
// Retour :
// - temps courant en millisecondes.
// ----------------------------------------------------------------------------
function readDefaultSimulationTime(): number {
  return performance.now();
}

// ----------------------------------------------------------------------------
// Programme une tranche de simulation avec le timer du navigateur.
//
// Parametres :
// - callback : tranche a executer.
// - delay : attente en millisecondes.
//
// Retour :
// - identifiant du timer cree.
// ----------------------------------------------------------------------------
function scheduleDefaultSimulationTick(callback: () => void, delay: number): number {
  return window.setTimeout(callback, delay);
}

// ----------------------------------------------------------------------------
// Annule un timer de simulation du navigateur.
//
// Parametres :
// - timerId : identifiant retourne par le planificateur.
// ----------------------------------------------------------------------------
function cancelDefaultSimulationTick(timerId: number): void {
  window.clearTimeout(timerId);
}

// Pilote borne d'une session de simulation locale.
export class BytecodeSimulationRunner {
  // Framebuffer adapte au rendu 3D existant.
  readonly framebuffer = new StreamingFramebuffer();

  // Horloge monotone utilisee par WAIT et les statistiques.
  private readonly now: () => number;

  // Planificateur d'une seule prochaine tranche.
  private readonly schedule: (callback: () => void, delay: number) => number;

  // Annulation du timer courant.
  private readonly cancel: (timerId: number) => void;

  // Callback de synchronisation avec l'interface.
  private readonly onUpdate: BytecodeSimulationOptions["onUpdate"];

  // Callback lie une seule fois pour eviter une nouvelle fonction par tranche.
  private readonly scheduledTick: () => void;

  // Copie du conteneur permettant de reinitialiser la graine.
  private container: Uint8Array | null = null;

  // VM courante, absente avant compilation.
  private vm: BytecodeReferenceVm | null = null;

  // Timer unique de la prochaine tranche.
  private timerId: number | null = null;

  // Graine appliquee a la prochaine reconstruction.
  private seed = BYTECODE_SIMULATION_DEFAULT_SEED;

  // Etat de lecture courant.
  private state: BytecodeSimulationSnapshot["state"] = "stopped";

  // Horodatage de depart des FPS simules.
  private startedAt = 0;

  // --------------------------------------------------------------------------
  // Construit un pilote avec horloge et timers injectables.
  //
  // Parametres :
  // - options : callback obligatoire et primitives temporelles facultatives.
  // --------------------------------------------------------------------------
  constructor(options: BytecodeSimulationOptions) {
    this.now = options.now ?? readDefaultSimulationTime;
    this.schedule = options.schedule ?? scheduleDefaultSimulationTick;
    this.cancel = options.cancel ?? cancelDefaultSimulationTick;
    this.onUpdate = options.onUpdate;
    this.scheduledTick = this.tick.bind(this);
  }

  // --------------------------------------------------------------------------
  // Charge un nouveau conteneur et remet la session a son origine.
  //
  // Parametres :
  // - container : conteneur deja valide par l'assembleur.
  // --------------------------------------------------------------------------
  load(container: Uint8Array): void {
    this.cancelTimer();
    this.container = container.slice();
    this.recreateVm();
    this.state = "stopped";
    this.publish();
  }

  // --------------------------------------------------------------------------
  // Demarre ou reprend la simulation.
  // --------------------------------------------------------------------------
  start(): void {
    if (this.vm === null || this.state === "halted" || this.state === "fault") return;
    if (this.state === "running") return;
    this.state = "running";
    if (this.startedAt === 0) this.startedAt = this.now();
    this.tick();
  }

  // --------------------------------------------------------------------------
  // Suspend la cadence sans perdre l'etat de la VM.
  // --------------------------------------------------------------------------
  pause(): void {
    if (this.state !== "running") return;
    this.cancelTimer();
    this.state = "paused";
    this.publish();
  }

  // --------------------------------------------------------------------------
  // Arrete la cadence en conservant la derniere frame visible.
  // --------------------------------------------------------------------------
  stop(): void {
    this.cancelTimer();
    this.state = "stopped";
    this.publish();
  }

  // --------------------------------------------------------------------------
  // Reconstruit la VM avec la graine initiale et remet les compteurs a zero.
  // --------------------------------------------------------------------------
  resetSeed(): void {
    if (this.container === null) return;
    const wasRunning = this.state === "running";
    this.cancelTimer();
    this.seed = BYTECODE_SIMULATION_DEFAULT_SEED;
    this.recreateVm();
    this.state = wasRunning ? "running" : "stopped";
    this.publish();
    if (wasRunning) this.scheduleNext();
  }

  // --------------------------------------------------------------------------
  // Execute une tranche puis planifie la suivante si necessaire.
  // --------------------------------------------------------------------------
  private tick(): void {
    this.timerId = null;
    if (this.vm === null || this.state !== "running") return;
    const result = this.vm.run(Math.trunc(this.now()));
    this.framebuffer.colors.set(this.vm.framebuffer);
    if (result.state === "fault") this.state = "fault";
    else if (result.state === "halted") this.state = "halted";
    this.publish(result.errorCode ?? null);
    if (this.state === "running") this.scheduleNext();
  }

  // --------------------------------------------------------------------------
  // Planifie une seule tranche a la cadence cible.
  // --------------------------------------------------------------------------
  private scheduleNext(): void {
    this.cancelTimer();
    this.timerId = this.schedule(this.scheduledTick, BYTECODE_SIMULATION_FRAME_INTERVAL_MS);
  }

  // --------------------------------------------------------------------------
  // Annule le timer courant lorsqu'il existe.
  // --------------------------------------------------------------------------
  private cancelTimer(): void {
    if (this.timerId === null) return;
    this.cancel(this.timerId);
    this.timerId = null;
  }

  // --------------------------------------------------------------------------
  // Recree la VM deterministe depuis la copie du dernier conteneur.
  // --------------------------------------------------------------------------
  private recreateVm(): void {
    if (this.container === null) return;
    this.vm = new BytecodeReferenceVm(this.container, this.seed);
    this.framebuffer.clear();
    this.startedAt = 0;
  }

  // --------------------------------------------------------------------------
  // Publie les compteurs courants et la derniere faute eventuelle.
  //
  // Parametres :
  // - lastFault : code runtime du dernier passage, absent sinon.
  // --------------------------------------------------------------------------
  private publish(lastFault: number | null = null): void {
    const instructionCount = this.vm?.trace.length ?? 0;
    const shownFrames = this.vm?.getShownFrameCount() ?? 0;
    const elapsedSeconds = this.startedAt === 0 ? 0 : (this.now() - this.startedAt) / 1000;
    this.onUpdate({
      state: this.state,
      instructionCount,
      shownFrames,
      measuredFps: elapsedSeconds > 0 ? shownFrames / elapsedSeconds : 0,
      lastFault,
    }, this.framebuffer);
  }
}
