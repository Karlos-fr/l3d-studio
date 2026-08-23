// ============================================================================
// BytecodeRender - Rendu de l'atelier d'animations procedurales
// ----------------------------------------------------------------------------
// Ce module produit le HTML et l'apercu de la VM. Il ne compile pas la source,
// ne lit pas localStorage et n'effectue aucun appel LAN.
// ============================================================================

import { BYTECODE_REFERENCE_PROGRAMS } from "../bytecode/reference_programs";
import type { StreamingFramebuffer } from "../streaming/framebuffer";
import type { AppState } from "./state";
import { drawStreamingFramebufferPreview } from "./streaming_render";

// Noms visibles du corpus fourni avec l'application.
const BYTECODE_EXAMPLE_LABELS: Readonly<Record<string, string>> = {
  rain: "Rain",
  sphere: "Sphère",
  fireworks: "Fireworks",
  plasma: "Plasma",
};

// ----------------------------------------------------------------------------
// Rend l'atelier complet depuis son etat courant.
//
// Parametres :
// - state : etat de l'editeur, du simulateur et du Photon.
//
// Retour :
// - fragment HTML autonome a inserer dans l'espace principal.
// ----------------------------------------------------------------------------
export function renderBytecodePanel(state: AppState): string {
  const bytecode = state.bytecode;
  const lanAvailable = state.lanHost.trim().length > 0 && Number.isInteger(state.lanPort);
  const selectedLibraryEntry = bytecode.selectedSourceKey.startsWith("library:");
  const photon = bytecode.photonStatus;
  const capabilityLabel = formatCapabilities(bytecode.compiledCapabilities);
  let sourceOptions = "";
  for (const example of BYTECODE_REFERENCE_PROGRAMS) {
    sourceOptions += renderOption(
      `example:${example.id}`,
      `Exemple — ${BYTECODE_EXAMPLE_LABELS[example.id] ?? example.id}`,
      bytecode.selectedSourceKey,
    );
  }
  for (const entry of bytecode.library) {
    sourceOptions += renderOption(
      `library:${entry.id}`,
      `Bibliothèque — ${entry.name}`,
      bytecode.selectedSourceKey,
    );
  }

  return `
    <section class="panel bytecode-panel" data-bytecode-panel>
      <div class="panel-heading">
        <h2>Animations procédurales</h2>
        <span class="status-pill">VM L3D v1</span>
      </div>
      <p>Écris une animation compacte, simule-la ici, puis installe-la directement sur le Photon par le LAN.</p>

      <div class="bytecode-layout">
        <div class="bytecode-editor-column">
          <div class="form-grid">
            <label>
              Source
              <select data-field="bytecode-source-select">${sourceOptions}</select>
            </label>
            <label>
              Nom
              <input data-field="bytecode-source-name" maxlength="64" value="${escapeHtml(bytecode.sourceName)}">
            </label>
          </div>
          <label>
            Assembleur L3D
            <textarea class="bytecode-editor" data-field="bytecode-source" spellcheck="false">${escapeHtml(bytecode.sourceText)}</textarea>
          </label>
          <div class="button-row">
            <button class="primary-action" data-action="bytecode-compile" type="button">Compiler</button>
            <button class="secondary-action" data-action="bytecode-save" type="button">Enregistrer</button>
            <button class="secondary-action" data-action="bytecode-duplicate" type="button" ${selectedLibraryEntry ? "" : "disabled"}>Dupliquer</button>
            <button class="secondary-action" data-action="bytecode-rename" type="button" ${selectedLibraryEntry ? "" : "disabled"}>Renommer</button>
            <button class="danger-action" data-action="bytecode-delete-source" type="button" ${selectedLibraryEntry ? "" : "disabled"}>Supprimer</button>
          </div>
          <p class="field-help" data-bytecode-compile-message>${escapeHtml(bytecode.compileMessage)}</p>
          <div class="bytecode-metrics">
            <span>Taille : <strong>${bytecode.compiledSize}</strong> / 197 octets</span>
            <span>Payload max : 185 octets</span>
            <span>Capacités : ${escapeHtml(capabilityLabel)}</span>
          </div>
        </div>

        <div class="bytecode-preview-column">
          <canvas class="streaming-preview bytecode-preview" data-bytecode-preview aria-label="Aperçu 3D de l'animation procédurale"></canvas>
          <div class="button-row">
            <button class="primary-action" data-action="bytecode-sim-start" type="button" ${bytecode.compiledContainer === null ? "disabled" : ""}>Démarrer</button>
            <button class="secondary-action" data-action="bytecode-sim-pause" type="button" ${bytecode.compiledContainer === null ? "disabled" : ""}>Pause</button>
            <button class="secondary-action" data-action="bytecode-sim-stop" type="button" ${bytecode.compiledContainer === null ? "disabled" : ""}>Arrêter</button>
            <button class="secondary-action" data-action="bytecode-sim-reset" type="button" ${bytecode.compiledContainer === null ? "disabled" : ""}>Réinitialiser la graine</button>
          </div>
          <div class="bytecode-metrics" aria-live="polite">
            <span>État : <strong data-bytecode-simulation-state>${escapeHtml(formatSimulationState(bytecode.simulation.state))}</strong></span>
            <span>Instructions : <strong data-bytecode-simulation-instructions>${bytecode.simulation.instructionCount}</strong></span>
            <span>FPS : <strong data-bytecode-simulation-fps>${bytecode.simulation.measuredFps.toFixed(1)}</strong></span>
            <span>Dernière faute : <strong data-bytecode-simulation-fault>${bytecode.simulation.lastFault ?? "aucune"}</strong></span>
          </div>
        </div>
      </div>

      <div class="bytecode-toolbar">
        <button class="secondary-action" data-action="bytecode-export" type="button">Exporter la bibliothèque</button>
        <label class="secondary-action file-action">
          Importer
          <input accept="application/json,.json" data-field="bytecode-import" type="file">
        </label>
      </div>

      <div class="bytecode-device">
        <div class="panel-heading">
          <h3>Programme installé sur le Photon</h3>
          <span class="status-pill">${photon === null
            ? "Photon non lu"
            : photon.installed
              ? `${photon.usedBytes} / ${photon.capacityBytes} octets, CRC ${formatCrc(photon.crc)}`
              : `Emplacement vide, ${photon.capacityBytes} octets disponibles`}</span>
        </div>
        <div class="button-row">
          <button class="secondary-action" data-action="bytecode-read" type="button" ${lanAvailable && !state.isBusy ? "" : "disabled"}>Lire</button>
          <button class="primary-action" data-action="bytecode-install" type="button" ${lanAvailable && bytecode.compiledContainer !== null && !state.isBusy ? "" : "disabled"}>Installer</button>
          <button class="primary-action" data-action="bytecode-run" type="button" ${lanAvailable && photon?.installed && !state.isBusy ? "" : "disabled"}>Lancer</button>
          <button class="secondary-action" data-action="bytecode-stop" type="button" ${lanAvailable && !state.isBusy ? "" : "disabled"}>Arrêter</button>
          <button class="danger-action" data-action="bytecode-delete-program" type="button" ${lanAvailable && photon?.installed && !state.isBusy ? "" : "disabled"}>Supprimer du Photon</button>
        </div>
        <p data-bytecode-operation-message>${escapeHtml(bytecode.operationMessage)}</p>
        <p class="field-help">Installation exclusivement par le LAN configuré ci-dessus.</p>
      </div>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Redessine l'apercu procedural apres un rendu complet ou une tranche VM.
//
// Parametres :
// - rootElement : racine contenant le canvas procedural.
// - framebuffer : framebuffer courant de la VM TypeScript.
// ----------------------------------------------------------------------------
export function updateBytecodePreview(
  rootElement: HTMLElement,
  framebuffer: StreamingFramebuffer,
): void {
  const canvas = rootElement.querySelector<HTMLCanvasElement>("[data-bytecode-preview]");
  if (canvas !== null) drawStreamingFramebufferPreview(canvas, framebuffer);
}

// ----------------------------------------------------------------------------
// Actualise les statistiques et l'apercu sans reconstruire l'editeur.
//
// Parametres :
// - rootElement : racine contenant le panneau procedural.
// - state : etat courant de la simulation.
// - framebuffer : derniere frame RGB produite.
// ----------------------------------------------------------------------------
export function updateBytecodeSimulationView(
  rootElement: HTMLElement,
  state: AppState,
  framebuffer: StreamingFramebuffer,
): void {
  const panel = rootElement.querySelector<HTMLElement>("[data-bytecode-panel]");
  if (panel === null) return;
  const stateElement = panel.querySelector<HTMLElement>("[data-bytecode-simulation-state]");
  const instructionsElement = panel.querySelector<HTMLElement>("[data-bytecode-simulation-instructions]");
  const fpsElement = panel.querySelector<HTMLElement>("[data-bytecode-simulation-fps]");
  const faultElement = panel.querySelector<HTMLElement>("[data-bytecode-simulation-fault]");
  if (stateElement !== null) stateElement.textContent = formatSimulationState(state.bytecode.simulation.state);
  if (instructionsElement !== null) instructionsElement.textContent = String(state.bytecode.simulation.instructionCount);
  if (fpsElement !== null) fpsElement.textContent = state.bytecode.simulation.measuredFps.toFixed(1);
  if (faultElement !== null) {
    faultElement.textContent = state.bytecode.simulation.lastFault === null
      ? "aucune"
      : String(state.bytecode.simulation.lastFault);
  }
  updateBytecodePreview(rootElement, framebuffer);
}

// ----------------------------------------------------------------------------
// Traduit l'etat technique du simulateur pour l'interface francaise.
//
// Parametres :
// - state : etat stable produit par le pilote de VM.
//
// Retour :
// - libelle francais court.
// ----------------------------------------------------------------------------
function formatSimulationState(
  state: AppState["bytecode"]["simulation"]["state"],
): string {
  switch (state) {
    case "running": return "en cours";
    case "paused": return "en pause";
    case "halted": return "terminée";
    case "fault": return "en faute";
    default: return "arrêtée";
  }
}

// ----------------------------------------------------------------------------
// Rend une option de source echappee.
//
// Parametres :
// - value : cle stable de la source.
// - label : libelle visible.
// - selectedValue : cle actuellement selectionnee.
//
// Retour :
// - element option HTML.
// ----------------------------------------------------------------------------
function renderOption(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

// ----------------------------------------------------------------------------
// Traduit le masque de capacites en libelles courts.
//
// Parametres :
// - capabilities : masque sur huit bits produit par l'assembleur.
//
// Retour :
// - liste lisible ou coeur seul.
// ----------------------------------------------------------------------------
function formatCapabilities(capabilities: number): string {
  const labels: string[] = [];
  if ((capabilities & 0x01) !== 0) labels.push("géométrie");
  if ((capabilities & 0x02) !== 0) labels.push("particules");
  if ((capabilities & 0x04) !== 0) labels.push("math8");
  return labels.length === 0 ? "cœur" : labels.join(", ");
}

// ----------------------------------------------------------------------------
// Formate un CRC non signe sur quatre chiffres hexadecimaux.
//
// Parametres :
// - crc : valeur sur seize bits.
//
// Retour :
// - texte uppercase prefixe par 0x.
// ----------------------------------------------------------------------------
function formatCrc(crc: number): string {
  return `0x${crc.toString(16).toUpperCase().padStart(4, "0")}`;
}

// ----------------------------------------------------------------------------
// Echappe une valeur destinee au contenu ou aux attributs HTML.
//
// Parametres :
// - value : texte non fiable a encoder.
//
// Retour :
// - texte sans balise executable.
// ----------------------------------------------------------------------------
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
