// ============================================================================
// DiagnosticsRender - Rendu du panneau de surveillance et de ses graphiques
// ----------------------------------------------------------------------------
// Ce fichier produit et actualise uniquement la zone Diagnostics. Il ne lance
// aucun appel reseau et ne reconstruit pas les autres formulaires de l'app.
// ============================================================================

import { renderDiagnosticsCharts } from "../diagnostics/charts";
import { diagnosticsHistoryValues } from "../diagnostics/history";
import type { DiagnosticsChartWindow } from "../diagnostics/types";
import { hasAvailableConfiguredTransport, type AppState } from "./state";

// Selecteur stable du contenu actualisable sans remplacer les controles.
const DIAGNOSTICS_LIVE_SELECTOR = "[data-diagnostics-live]";

// ----------------------------------------------------------------------------
// Rend le panneau complet avec ses controles persistants et son contenu vivant.
//
// Parametres :
// - state : etat applicatif et historique de diagnostics.
//
// Retour :
// - section HTML autonome pour les mesures du serveur LAN.
// ----------------------------------------------------------------------------
export function renderDiagnosticsPanel(state: AppState): string {
  const diagnosticsState = state.diagnostics;
  const disabled = state.isBusy || !hasAvailableConfiguredTransport(state) ? "disabled" : "";
  const historyDisabled = diagnosticsState.history.length === 0 ? "disabled" : "";
  return `
    <section class="panel diagnostics-panel" data-diagnostics-panel>
      <div class="panel-heading diagnostics-heading">
        <h2>Diagnostics</h2>
        <div class="diagnostics-actions">
          <button class="secondary-action" data-action="refresh-diagnostics" type="button" ${disabled}>
            Actualiser maintenant
          </button>
          <button class="secondary-action danger-action" data-action="reset-diagnostics" type="button" ${disabled}>
            Remettre les minimums a zero
          </button>
        </div>
      </div>
      <div class="form-grid diagnostics-controls">
        <label class="inline-control">
          <input data-field="diagnostics-enabled" type="checkbox" ${diagnosticsState.enabled ? "checked" : ""} ${disabled} />
          Surveillance periodique
        </label>
        <label>
          Intervalle
          <select data-field="diagnostics-interval" ${state.isBusy ? "disabled" : ""}>
            ${renderDiagnosticsIntervalOptions(diagnosticsState.intervalSeconds)}
          </select>
        </label>
        <label>
          Fenetre des graphiques
          <select data-field="diagnostics-window">
            ${renderDiagnosticsWindowOptions(diagnosticsState.chartWindow)}
          </select>
        </label>
        <button class="secondary-action" data-action="clear-diagnostics-history" type="button" ${historyDisabled}>
          Effacer l'historique graphique
        </button>
      </div>
      <div data-diagnostics-live aria-live="polite">
        ${renderDiagnosticsLiveContent(state)}
      </div>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Remplace seulement les KPI et graphiques du panneau deja monte.
//
// Parametres :
// - rootElement : racine DOM de l'application.
// - state : etat applicatif contenant le nouvel echantillon.
//
// Retour :
// - vrai si la zone cible a ete trouvee et actualisee.
//
// Effet de bord :
// - remplace le contenu vivant sans toucher aux autres champs de formulaire.
// ----------------------------------------------------------------------------
export function updateDiagnosticsView(
  rootElement: HTMLElement,
  state: AppState,
): boolean {
  const liveElement = rootElement.querySelector<HTMLElement>(DIAGNOSTICS_LIVE_SELECTOR);
  if (liveElement === null) return false;
  const chartWidth = liveElement.clientWidth > 0 ? liveElement.clientWidth : undefined;
  liveElement.innerHTML = renderDiagnosticsLiveContent(state, chartWidth);
  const clearButton = rootElement.querySelector<HTMLButtonElement>(
    "[data-action='clear-diagnostics-history']",
  );
  if (clearButton !== null) clearButton.disabled = state.diagnostics.history.length === 0;
  return true;
}

// ----------------------------------------------------------------------------
// Rend les messages, KPI, graphiques et sortie de survol actualisables.
//
// Parametres :
// - state : etat applicatif courant.
// - chartWidth : largeur disponible optionnelle pour les SVG.
//
// Retour :
// - fragment HTML autonome de la partie vivante du panneau.
// ----------------------------------------------------------------------------
export function renderDiagnosticsLiveContent(
  state: AppState,
  chartWidth?: number,
): string {
  const history = diagnosticsHistoryValues(state.diagnostics);
  return `
    ${renderDiagnosticsMessages(state)}
    ${renderDiagnosticsSample(state)}
    <div class="diagnostics-chart-tooltip" data-chart-tooltip role="status" aria-live="polite">
      Survole ou selectionne un point pour afficher ses valeurs.
    </div>
    ${renderDiagnosticsCharts(history, state.diagnostics.chartWindow, chartWidth)}
  `;
}

// ----------------------------------------------------------------------------
// Rend les quatre intervalles de surveillance autorises.
//
// Parametres :
// - selectedInterval : intervalle actuellement choisi.
//
// Retour :
// - options HTML de 5, 10, 30 et 60 secondes.
// ----------------------------------------------------------------------------
function renderDiagnosticsIntervalOptions(selectedInterval: number): string {
  let output = "";
  for (const interval of [5, 10, 30, 60]) {
    const selected = interval === selectedInterval ? "selected" : "";
    output += `<option value="${interval}" ${selected}>${interval} secondes</option>`;
  }
  return output;
}

// ----------------------------------------------------------------------------
// Rend les choix de fenetre temporelle des graphiques.
//
// Parametres :
// - selectedWindow : fenetre courte ou complete actuellement choisie.
//
// Retour :
// - options HTML correspondantes.
// ----------------------------------------------------------------------------
function renderDiagnosticsWindowOptions(
  selectedWindow: DiagnosticsChartWindow,
): string {
  const recentSelected = selectedWindow === "recent" ? "selected" : "";
  const allSelected = selectedWindow === "all" ? "selected" : "";
  return `
    <option value="recent" ${recentSelected}>5 dernieres minutes</option>
    <option value="all" ${allSelected}>Historique complet</option>
  `;
}

// ----------------------------------------------------------------------------
// Rend les alertes et le dernier echec sans supprimer les KPI valides.
//
// Parametres :
// - state : etat contenant messages et compteurs d'erreur.
//
// Retour :
// - messages HTML bornes ou chaine vide.
// ----------------------------------------------------------------------------
function renderDiagnosticsMessages(state: AppState): string {
  const warning = state.diagnostics.warningMessage;
  const error = state.diagnostics.lastError;
  return `
    ${warning === null ? "" : `<p class="diagnostics-warning">${escapeHtml(warning)}</p>`}
    ${
      error === null
        ? ""
        : `<p class="diagnostics-error">Dernier echec (${state.diagnostics.consecutiveErrors}) : ${escapeHtml(error)}</p>`
    }
  `;
}

// ----------------------------------------------------------------------------
// Rend le dernier echantillon de diagnostics dans ses unites d'affichage.
//
// Parametres :
// - state : etat contenant le dernier echantillon eventuel.
//
// Retour :
// - grille de KPI ou indication d'absence de lecture.
// ----------------------------------------------------------------------------
function renderDiagnosticsSample(state: AppState): string {
  const sample = state.diagnostics.latestSample;
  if (sample === null) return "<p>Aucun echantillon de diagnostics.</p>";
  const values = sample.diagnostics;
  const capturedAt = new Date(sample.capturedAtMilliseconds).toLocaleTimeString("fr-FR");
  return `
    <p>Dernier echantillon : ${escapeHtml(capturedAt)}, source ${sample.source}, latence ${sample.latencyMilliseconds.toFixed(0)} ms.</p>
    <dl class="metrics-grid diagnostics-metrics">
      <div><dt>Memoire libre</dt><dd>${formatMemory(values.freeMemory)}</dd></div>
      <div><dt>Minimum global</dt><dd>${formatMemory(values.minimumFreeMemory)}</dd></div>
      <div><dt>Minimum du mode</dt><dd>${formatMemory(values.modeMinimumFreeMemory)}</dd></div>
      <div><dt>Avant / apres frame</dt><dd>${formatMemory(values.frameMemoryBefore)} / ${formatMemory(values.frameMemoryAfter)}</dd></div>
      <div><dt>Frame derniere</dt><dd>${formatFrameMilliseconds(values.lastFrameMicros)}</dd></div>
      <div><dt>Frame moyenne</dt><dd>${formatFrameMilliseconds(values.averageFrameMicros)}</dd></div>
      <div><dt>Pire frame</dt><dd>${formatFrameMilliseconds(values.worstFrameMicros)}</dd></div>
      <div><dt>FPS moyen</dt><dd>${(values.fpsTimesTen / 10).toFixed(1)}</dd></div>
      <div><dt>Uptime</dt><dd>${values.uptimeSeconds} s</dd></div>
      <div><dt>Mode / frames</dt><dd>${values.modeId} / ${values.frameCount}</dd></div>
      <div><dt>Wi-Fi / Cloud OTA</dt><dd>${formatBooleanState(values.wifiReady)} / ${formatBooleanState(values.particleConnected)}</dd></div>
      <div><dt>Reset / OOM</dt><dd>${values.resetReason} / ${values.outOfMemoryCount}</dd></div>
    </dl>
  `;
}

// ----------------------------------------------------------------------------
// Formate une valeur memoire en octets et Kio.
//
// Parametres :
// - value : nombre d'octets brut du firmware.
//
// Retour :
// - representation double unite.
// ----------------------------------------------------------------------------
function formatMemory(value: number): string {
  return `${value} octets (${(value / 1_024).toFixed(1)} Kio)`;
}

// ----------------------------------------------------------------------------
// Convertit des microsecondes firmware en millisecondes d'affichage.
//
// Parametres :
// - value : duree brute en microsecondes.
//
// Retour :
// - duree avec deux decimales.
// ----------------------------------------------------------------------------
function formatFrameMilliseconds(value: number): string {
  return `${(value / 1_000).toFixed(2)} ms`;
}

// ----------------------------------------------------------------------------
// Formate un etat de connexion booleen.
//
// Parametres :
// - value : etat brut valide.
//
// Retour :
// - libelle lisible actif ou inactif.
// ----------------------------------------------------------------------------
function formatBooleanState(value: boolean): string {
  return value ? "actif" : "inactif";
}

// ----------------------------------------------------------------------------
// Echappe un texte avant son insertion dans le HTML.
//
// Parametres :
// - value : texte potentiellement non fiable.
//
// Retour :
// - texte sans balisage executable.
// ----------------------------------------------------------------------------
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
