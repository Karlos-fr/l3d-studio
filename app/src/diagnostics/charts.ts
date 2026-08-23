// ============================================================================
// DiagnosticsCharts - Rendu SVG des historiques de KPI
// ----------------------------------------------------------------------------
// Ce fichier transforme des points bruts en courbes SVG accessibles. Il ne
// connait ni le DOM courant, ni les transports, ni la collecte reseau.
// ============================================================================

import type {
  DiagnosticsChartWindow,
  DiagnosticsHistoryPoint,
} from "./types";

type DiagnosticsMetric =
  | "freeMemory"
  | "minimumFreeMemory"
  | "modeMinimumFreeMemory"
  | "lastFrameMicros"
  | "averageFrameMicros"
  | "worstFrameMicros"
  | "fpsTimesTen";

type DiagnosticsUnit = "bytes" | "milliseconds" | "fps";

interface ChartSeriesDefinition {
  label: string;
  metric: DiagnosticsMetric;
  className: string;
}

interface ChartDefinition {
  id: string;
  title: string;
  axisLabel: string;
  unit: DiagnosticsUnit;
  series: ChartSeriesDefinition[];
}

export interface LinearScale {
  domainMinimum: number;
  domainMaximum: number;
  outputMinimum: number;
  outputMaximum: number;
}

// Largeur maximale qui evite d'etirer inutilement les courbes.
const MAXIMUM_CHART_WIDTH = 720;

// Largeur minimale qui conserve axes et libelles lisibles sur mobile.
const MINIMUM_CHART_WIDTH = 280;

// Hauteur logique compacte de chaque graphique SVG.
const CHART_HEIGHT = 190;

// Marge reservee aux valeurs de l'axe vertical.
const CHART_LEFT = 48;

// Marge droite protegeant le dernier point et sa cible interactive.
const CHART_RIGHT = 18;

// Marge haute reservee aux marqueurs d'evenements.
const CHART_TOP = 16;

// Marge basse reservee aux heures et au titre de l'axe.
const CHART_BOTTOM = 34;

// Nombre maximal de points interactifs rendus par graphique.
export const MAX_RENDERED_DIAGNOSTICS_POINTS = 120;

// Duree de la fenetre courte proposee dans l'interface.
export const RECENT_DIAGNOSTICS_WINDOW_MILLISECONDS = 5 * 60 * 1_000;

// Series memoire exprimees dans les octets bruts du firmware.
const MEMORY_SERIES: ChartSeriesDefinition[] = [
  { label: "Libre", metric: "freeMemory", className: "chart-series-1" },
  { label: "Minimum global", metric: "minimumFreeMemory", className: "chart-series-2" },
  { label: "Minimum du mode", metric: "modeMinimumFreeMemory", className: "chart-series-3" },
];

// Series de temps converties des microsecondes brutes vers les millisecondes.
const FRAME_SERIES: ChartSeriesDefinition[] = [
  { label: "Derniere", metric: "lastFrameMicros", className: "chart-series-1" },
  { label: "Moyenne", metric: "averageFrameMicros", className: "chart-series-2" },
  { label: "Pire", metric: "worstFrameMicros", className: "chart-series-4" },
];

// Serie FPS convertie depuis les dixiemes exposes par le firmware.
const FPS_SERIES: ChartSeriesDefinition[] = [
  { label: "FPS", metric: "fpsTimesTen", className: "chart-series-5" },
];

// Definition du graphique de memoire.
const MEMORY_CHART: ChartDefinition = {
  id: "memory",
  title: "Memoire",
  axisLabel: "Memoire (Kio)",
  unit: "bytes",
  series: MEMORY_SERIES,
};

// Definition du graphique de duree des frames.
const FRAME_CHART: ChartDefinition = {
  id: "frames",
  title: "Temps de frame",
  axisLabel: "Duree (ms)",
  unit: "milliseconds",
  series: FRAME_SERIES,
};

// Definition du graphique de frequence de rendu.
const FPS_CHART: ChartDefinition = {
  id: "fps",
  title: "FPS",
  axisLabel: "Images par seconde",
  unit: "fps",
  series: FPS_SERIES,
};

// Liste ordonnee des graphiques affiches dans le panneau.
const DIAGNOSTICS_CHARTS: ChartDefinition[] = [MEMORY_CHART, FRAME_CHART, FPS_CHART];

// ----------------------------------------------------------------------------
// Convertit une duree firmware brute en millisecondes.
//
// Parametres :
// - value : duree en microsecondes.
//
// Retour :
// - duree en millisecondes sans modifier la valeur source.
// ----------------------------------------------------------------------------
export function convertMicrosToMilliseconds(value: number): number {
  return value / 1_000;
}

// ----------------------------------------------------------------------------
// Convertit les dixiemes de FPS firmware en images par seconde.
//
// Parametres :
// - value : frequence multipliee par dix.
//
// Retour :
// - frequence en images par seconde sans modifier la valeur source.
// ----------------------------------------------------------------------------
export function convertFpsTimesTen(value: number): number {
  return value / 10;
}

// ----------------------------------------------------------------------------
// Construit une echelle lineaire robuste aux valeurs absentes ou constantes.
//
// Parametres :
// - values : valeurs d'entree eventuellement absentes.
// - outputMinimum : debut de l'intervalle graphique.
// - outputMaximum : fin de l'intervalle graphique.
//
// Retour :
// - domaine rembourre et intervalle de sortie associe.
// ----------------------------------------------------------------------------
export function createLinearScale(
  values: Array<number | null>,
  outputMinimum: number,
  outputMaximum: number,
): LinearScale {
  let domainMinimum = Number.POSITIVE_INFINITY;
  let domainMaximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    domainMinimum = Math.min(domainMinimum, value);
    domainMaximum = Math.max(domainMaximum, value);
  }
  if (!Number.isFinite(domainMinimum) || !Number.isFinite(domainMaximum)) {
    domainMinimum = 0;
    domainMaximum = 1;
  } else if (domainMinimum === domainMaximum) {
    const padding = Math.max(Math.abs(domainMinimum) * 0.05, 1);
    domainMinimum -= padding;
    domainMaximum += padding;
  } else {
    const padding = (domainMaximum - domainMinimum) * 0.05;
    domainMinimum -= padding;
    domainMaximum += padding;
  }
  return { domainMinimum, domainMaximum, outputMinimum, outputMaximum };
}

// ----------------------------------------------------------------------------
// Projette une valeur dans l'intervalle graphique d'une echelle lineaire.
//
// Parametres :
// - scale : echelle lineaire prealablement calculee.
// - value : valeur numerique a projeter.
//
// Retour :
// - position correspondante dans l'intervalle de sortie.
// ----------------------------------------------------------------------------
export function projectLinearValue(scale: LinearScale, value: number): number {
  const ratio =
    (value - scale.domainMinimum) /
    (scale.domainMaximum - scale.domainMinimum);
  return scale.outputMinimum + ratio * (scale.outputMaximum - scale.outputMinimum);
}

// ----------------------------------------------------------------------------
// Rend les trois graphiques de diagnostics pour la fenetre demandee.
//
// Parametres :
// - history : points chronologiques bruts et marqueurs derives.
// - chartWindow : fenetre courte ou historique complet.
// - requestedWidth : largeur disponible optionnelle du conteneur.
//
// Retour :
// - fragment HTML contenant SVG, legendes et alternatives textuelles.
// ----------------------------------------------------------------------------
export function renderDiagnosticsCharts(
  history: DiagnosticsHistoryPoint[],
  chartWindow: DiagnosticsChartWindow,
  requestedWidth = MAXIMUM_CHART_WIDTH,
): string {
  const windowedHistory = selectDiagnosticsWindow(history, chartWindow);
  const renderedHistory = limitRenderedPoints(windowedHistory);
  // Largeur par carte lorsque les trois graphiques tiennent sur une ligne.
  const chartWidth = normalizeChartWidth(
    requestedWidth >= 900 ? (requestedWidth - 40) / 3 : requestedWidth,
  );
  if (renderedHistory.length === 0) {
    return '<p class="diagnostics-chart-empty">Aucune donnee historique a tracer.</p>';
  }
  let output = '<div class="diagnostics-charts">';
  for (const definition of DIAGNOSTICS_CHARTS) {
    output += renderSingleChart(definition, renderedHistory, chartWidth);
  }
  output += '</div>';
  return output;
}

// ----------------------------------------------------------------------------
// Selectionne les cinq dernieres minutes ou la totalite des points.
//
// Parametres :
// - history : points chronologiques disponibles.
// - chartWindow : fenetre demandee par l'utilisateur.
//
// Retour :
// - copie filtree qui conserve l'ordre chronologique.
// ----------------------------------------------------------------------------
export function selectDiagnosticsWindow(
  history: DiagnosticsHistoryPoint[],
  chartWindow: DiagnosticsChartWindow,
): DiagnosticsHistoryPoint[] {
  if (chartWindow === "all" || history.length === 0) return history.slice();
  const latestTime = history[history.length - 1]?.sample.capturedAtMilliseconds ?? 0;
  const minimumTime = latestTime - RECENT_DIAGNOSTICS_WINDOW_MILLISECONDS;
  const selected: DiagnosticsHistoryPoint[] = [];
  for (const point of history) {
    if (point.sample.capturedAtMilliseconds >= minimumTime) selected.push(point);
  }
  return selected;
}

// ----------------------------------------------------------------------------
// Limite les points SVG tout en preservant les evenements importants.
//
// Parametres :
// - history : points de la fenetre courante.
//
// Retour :
// - points echantillonnes dans leur ordre chronologique.
// ----------------------------------------------------------------------------
export function limitRenderedPoints(
  history: DiagnosticsHistoryPoint[],
): DiagnosticsHistoryPoint[] {
  if (history.length <= MAX_RENDERED_DIAGNOSTICS_POINTS) return history.slice();
  const selectedIndexes = new Set<number>();
  selectedIndexes.add(0);
  selectedIndexes.add(history.length - 1);
  for (let slot = 0; slot < MAX_RENDERED_DIAGNOSTICS_POINTS; slot += 1) {
    selectedIndexes.add(
      Math.round((slot * (history.length - 1)) / (MAX_RENDERED_DIAGNOSTICS_POINTS - 1)),
    );
  }
  for (let index = 0; index < history.length; index += 1) {
    const point = history[index];
    if (
      point !== undefined &&
      (point.breakReason !== null || point.modeChanged || point.outOfMemoryOccurred)
    ) {
      selectedIndexes.add(index);
    }
  }
  const indexes = Array.from(selectedIndexes);
  indexes.sort(compareNumericIndexes);
  const retainedIndexes =
    indexes.length <= MAX_RENDERED_DIAGNOSTICS_POINTS
      ? indexes
      : indexes.slice(indexes.length - MAX_RENDERED_DIAGNOSTICS_POINTS);
  const selected: DiagnosticsHistoryPoint[] = [];
  for (const index of retainedIndexes) {
    const point = history[index];
    if (point !== undefined) selected.push(point);
  }
  return selected;
}

// ----------------------------------------------------------------------------
// Compare deux index numeriques pour leur tri chronologique.
//
// Parametres :
// - left : premier index.
// - right : second index.
//
// Retour :
// - difference compatible avec `Array.sort`.
// ----------------------------------------------------------------------------
function compareNumericIndexes(left: number, right: number): number {
  return left - right;
}

// ----------------------------------------------------------------------------
// Rend un graphique SVG complet avec axes, series, points et resume.
//
// Parametres :
// - definition : titre, unite et series a tracer.
// - history : points deja filtres et limites.
// - chartWidth : largeur logique mesuree du SVG.
//
// Retour :
// - section HTML accessible du graphique.
// ----------------------------------------------------------------------------
function renderSingleChart(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
  chartWidth: number,
): string {
  const values = collectChartValues(definition, history);
  const yScale = createLinearScale(values, CHART_HEIGHT - CHART_BOTTOM, CHART_TOP);
  const xScale = createTimeScale(history, chartWidth);
  const description = buildChartDescription(definition, history);
  return `
    <section class="diagnostics-chart" aria-labelledby="diagnostics-chart-${definition.id}-title">
      <div class="diagnostics-chart-heading">
        <h3 id="diagnostics-chart-${definition.id}-title">${definition.title}</h3>
        ${renderLegend(definition)}
      </div>
      <svg viewBox="0 0 ${chartWidth} ${CHART_HEIGHT}" role="img" aria-label="${escapeAttribute(description)}" preserveAspectRatio="xMidYMid meet">
        <title>${escapeHtml(definition.title)}</title>
        <desc>${escapeHtml(description)}</desc>
        ${renderAxes(definition, history, yScale, chartWidth)}
        ${renderEventMarkers(history, xScale)}
        ${renderSeries(definition, history, xScale, yScale)}
        ${renderInteractivePoints(definition, history, xScale, yScale)}
      </svg>
      <p class="diagnostics-chart-summary">${escapeHtml(description)}</p>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Collecte toutes les valeurs finies qui participent au domaine vertical.
//
// Parametres :
// - definition : series du graphique.
// - history : points historiques affiches.
//
// Retour :
// - valeurs converties, avec `null` pour les donnees invalides.
// ----------------------------------------------------------------------------
function collectChartValues(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
): Array<number | null> {
  const values: Array<number | null> = [];
  for (const point of history) {
    for (const series of definition.series) {
      values.push(readSeriesValue(point, series.metric, definition.unit));
    }
  }
  return values;
}

// ----------------------------------------------------------------------------
// Construit l'echelle temporelle du premier au dernier echantillon.
//
// Parametres :
// - history : points chronologiques affiches.
// - chartWidth : largeur logique mesuree du SVG.
//
// Retour :
// - echelle horizontale avec marge pour un point unique.
// ----------------------------------------------------------------------------
function createTimeScale(
  history: DiagnosticsHistoryPoint[],
  chartWidth: number,
): LinearScale {
  const firstTime = history[0]?.sample.capturedAtMilliseconds ?? 0;
  const lastTime = history[history.length - 1]?.sample.capturedAtMilliseconds ?? firstTime;
  const times = firstTime === lastTime ? [firstTime - 1_000, lastTime + 1_000] : [firstTime, lastTime];
  return {
    domainMinimum: times[0] ?? 0,
    domainMaximum: times[1] ?? 1,
    outputMinimum: CHART_LEFT,
    outputMaximum: chartWidth - CHART_RIGHT,
  };
}

// ----------------------------------------------------------------------------
// Rend le cadre, les graduations et les titres d'axes.
//
// Parametres :
// - definition : unite et libelle du graphique.
// - history : points fournissant les bornes temporelles.
// - yScale : echelle verticale calculee.
// - chartWidth : largeur logique mesuree du SVG.
//
// Retour :
// - primitives SVG des axes.
// ----------------------------------------------------------------------------
function renderAxes(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
  yScale: LinearScale,
  chartWidth: number,
): string {
  const firstTime = history[0]?.sample.capturedAtMilliseconds ?? 0;
  const lastTime = history[history.length - 1]?.sample.capturedAtMilliseconds ?? firstTime;
  const middleValue = (yScale.domainMinimum + yScale.domainMaximum) / 2;
  const plotBottom = CHART_HEIGHT - CHART_BOTTOM;
  return `
    <rect class="chart-frame" x="${CHART_LEFT}" y="${CHART_TOP}" width="${chartWidth - CHART_LEFT - CHART_RIGHT}" height="${plotBottom - CHART_TOP}" />
    <line class="chart-grid" x1="${CHART_LEFT}" y1="${CHART_TOP}" x2="${chartWidth - CHART_RIGHT}" y2="${CHART_TOP}" />
    <line class="chart-grid" x1="${CHART_LEFT}" y1="${(CHART_TOP + plotBottom) / 2}" x2="${chartWidth - CHART_RIGHT}" y2="${(CHART_TOP + plotBottom) / 2}" />
    <line class="chart-grid" x1="${CHART_LEFT}" y1="${plotBottom}" x2="${chartWidth - CHART_RIGHT}" y2="${plotBottom}" />
    <text class="chart-axis-label" x="${CHART_LEFT - 8}" y="${CHART_TOP + 4}" text-anchor="end">${formatAxisValue(yScale.domainMaximum, definition.unit)}</text>
    <text class="chart-axis-label" x="${CHART_LEFT - 8}" y="${(CHART_TOP + plotBottom) / 2 + 4}" text-anchor="end">${formatAxisValue(middleValue, definition.unit)}</text>
    <text class="chart-axis-label" x="${CHART_LEFT - 8}" y="${plotBottom + 4}" text-anchor="end">${formatAxisValue(yScale.domainMinimum, definition.unit)}</text>
    <text class="chart-axis-label" x="${CHART_LEFT}" y="${plotBottom + 18}" text-anchor="start">${formatLocalTime(firstTime)}</text>
    <text class="chart-axis-label" x="${chartWidth - CHART_RIGHT}" y="${plotBottom + 18}" text-anchor="end">${formatLocalTime(lastTime)}</text>
    <text class="chart-axis-title" x="${(CHART_LEFT + chartWidth - CHART_RIGHT) / 2}" y="${CHART_HEIGHT - 3}" text-anchor="middle">${escapeHtml(definition.axisLabel)}</text>
  `;
}

// ----------------------------------------------------------------------------
// Borne la largeur mesuree afin de conserver un SVG lisible et raisonnable.
//
// Parametres :
// - requestedWidth : largeur disponible mesuree dans le panneau.
//
// Retour :
// - largeur entiere comprise entre les bornes mobile et bureau.
// ----------------------------------------------------------------------------
function normalizeChartWidth(requestedWidth: number): number {
  if (!Number.isFinite(requestedWidth)) return MAXIMUM_CHART_WIDTH;
  return Math.round(
    Math.min(MAXIMUM_CHART_WIDTH, Math.max(MINIMUM_CHART_WIDTH, requestedWidth)),
  );
}

// ----------------------------------------------------------------------------
// Rend la legende textuelle et coloree des series.
//
// Parametres :
// - definition : series du graphique.
//
// Retour :
// - liste HTML des libelles de series.
// ----------------------------------------------------------------------------
function renderLegend(definition: ChartDefinition): string {
  let output = '<ul class="chart-legend" aria-label="Legende">';
  for (const series of definition.series) {
    output += `<li><span class="chart-legend-swatch ${series.className}" aria-hidden="true"></span>${escapeHtml(series.label)}</li>`;
  }
  output += '</ul>';
  return output;
}

// ----------------------------------------------------------------------------
// Rend les chemins de toutes les series en respectant les ruptures.
//
// Parametres :
// - definition : series et unite du graphique.
// - history : points chronologiques affiches.
// - xScale : echelle temporelle horizontale.
// - yScale : echelle verticale commune aux series.
//
// Retour :
// - chemins SVG sans remplissage.
// ----------------------------------------------------------------------------
function renderSeries(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
  xScale: LinearScale,
  yScale: LinearScale,
): string {
  let output = "";
  for (const series of definition.series) {
    const path = buildSeriesPath(series, definition.unit, history, xScale, yScale);
    output += `<path class="chart-line ${series.className}" d="${path}" />`;
  }
  return output;
}

// ----------------------------------------------------------------------------
// Construit un chemin SVG et recommence par `M` apres chaque rupture.
//
// Parametres :
// - series : metrique a lire.
// - unit : conversion d'affichage a appliquer.
// - history : points chronologiques affiches.
// - xScale : echelle temporelle horizontale.
// - yScale : echelle verticale commune.
//
// Retour :
// - attribut `d` du chemin SVG.
// ----------------------------------------------------------------------------
function buildSeriesPath(
  series: ChartSeriesDefinition,
  unit: DiagnosticsUnit,
  history: DiagnosticsHistoryPoint[],
  xScale: LinearScale,
  yScale: LinearScale,
): string {
  let path = "";
  let hasOpenSegment = false;
  for (const point of history) {
    const value = readSeriesValue(point, series.metric, unit);
    if (value === null) {
      hasOpenSegment = false;
      continue;
    }
    const x = roundCoordinate(projectLinearValue(xScale, point.sample.capturedAtMilliseconds));
    const y = roundCoordinate(projectLinearValue(yScale, value));
    const command = !hasOpenSegment || point.breakReason !== null ? "M" : "L";
    path += `${command}${x},${y} `;
    hasOpenSegment = true;
  }
  return path.trim();
}

// ----------------------------------------------------------------------------
// Rend une cible focusable par echantillon avec toutes ses valeurs lisibles.
//
// Parametres :
// - definition : series du graphique.
// - history : points chronologiques affiches.
// - xScale : echelle temporelle horizontale.
// - yScale : echelle verticale commune.
//
// Retour :
// - cercles SVG transparents et accessibles au clavier.
// ----------------------------------------------------------------------------
function renderInteractivePoints(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
  xScale: LinearScale,
  yScale: LinearScale,
): string {
  let output = "";
  for (const point of history) {
    const firstSeries = definition.series[0];
    if (firstSeries === undefined) continue;
    const firstValue = readSeriesValue(point, firstSeries.metric, definition.unit);
    if (firstValue === null) continue;
    const x = roundCoordinate(projectLinearValue(xScale, point.sample.capturedAtMilliseconds));
    const y = roundCoordinate(projectLinearValue(yScale, firstValue));
    const tooltip = buildPointTooltip(definition, point);
    output += `<circle class="chart-hit" cx="${x}" cy="${y}" r="7" tabindex="0" data-chart-point data-tooltip="${escapeAttribute(tooltip)}" aria-label="${escapeAttribute(tooltip)}"><title>${escapeHtml(tooltip)}</title></circle>`;
  }
  return output;
}

// ----------------------------------------------------------------------------
// Rend les marqueurs verticaux de mode, redemarrage, interruption et OOM.
//
// Parametres :
// - history : points et evenements derives.
// - xScale : echelle temporelle horizontale.
//
// Retour :
// - lignes SVG annotees pour chaque point remarquable.
// ----------------------------------------------------------------------------
function renderEventMarkers(
  history: DiagnosticsHistoryPoint[],
  xScale: LinearScale,
): string {
  let output = "";
  for (const point of history) {
    const labels = eventLabels(point);
    if (labels.length === 0) continue;
    const x = roundCoordinate(projectLinearValue(xScale, point.sample.capturedAtMilliseconds));
    const label = labels.join(", ");
    output += `<line class="chart-event-marker" x1="${x}" y1="${CHART_TOP}" x2="${x}" y2="${CHART_HEIGHT - CHART_BOTTOM}"><title>${escapeHtml(label)}</title></line>`;
  }
  return output;
}

// ----------------------------------------------------------------------------
// Construit les libelles d'evenements associes a un point.
//
// Parametres :
// - point : point historique enrichi.
//
// Retour :
// - libelles courts dans leur ordre de priorite.
// ----------------------------------------------------------------------------
function eventLabels(point: DiagnosticsHistoryPoint): string[] {
  const labels: string[] = [];
  if (point.breakReason === "restart") labels.push("Redemarrage detecte");
  if (point.breakReason === "interruption") labels.push("Interruption de collecte");
  if (point.modeChanged) labels.push(`Mode ${point.sample.diagnostics.modeId}`);
  if (point.outOfMemoryOccurred) labels.push("Evenement OOM");
  return labels;
}

// ----------------------------------------------------------------------------
// Lit et convertit une metrique sans modifier l'echantillon firmware brut.
//
// Parametres :
// - point : point contenant les diagnostics bruts.
// - metric : champ firmware demande.
// - unit : conversion d'affichage du graphique.
//
// Retour :
// - valeur finie convertie ou `null` si elle est invalide.
// ----------------------------------------------------------------------------
function readSeriesValue(
  point: DiagnosticsHistoryPoint,
  metric: DiagnosticsMetric,
  unit: DiagnosticsUnit,
): number | null {
  const rawValue = point.sample.diagnostics[metric];
  if (!Number.isFinite(rawValue)) return null;
  if (unit === "milliseconds") return convertMicrosToMilliseconds(rawValue);
  if (unit === "fps") return convertFpsTimesTen(rawValue);
  return rawValue;
}

// ----------------------------------------------------------------------------
// Construit le texte de survol et de focus d'un echantillon.
//
// Parametres :
// - definition : series et unite affichees.
// - point : echantillon cible.
//
// Retour :
// - heure suivie de toutes les valeurs disponibles.
// ----------------------------------------------------------------------------
function buildPointTooltip(
  definition: ChartDefinition,
  point: DiagnosticsHistoryPoint,
): string {
  let tooltip = formatLocalTime(point.sample.capturedAtMilliseconds);
  for (const series of definition.series) {
    const value = readSeriesValue(point, series.metric, definition.unit);
    if (value !== null) tooltip += `, ${series.label} ${formatSeriesValue(value, definition.unit)}`;
  }
  const labels = eventLabels(point);
  if (labels.length > 0) tooltip += `, ${labels.join(", ")}`;
  return tooltip;
}

// ----------------------------------------------------------------------------
// Resume minimum, maximum et derniere valeur de chaque serie.
//
// Parametres :
// - definition : series et unite affichees.
// - history : points chronologiques affiches.
//
// Retour :
// - alternative textuelle concise du graphique.
// ----------------------------------------------------------------------------
function buildChartDescription(
  definition: ChartDefinition,
  history: DiagnosticsHistoryPoint[],
): string {
  let description = `${definition.title}. `;
  for (let seriesIndex = 0; seriesIndex < definition.series.length; seriesIndex += 1) {
    const series = definition.series[seriesIndex];
    if (series === undefined) continue;
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    let latest: number | null = null;
    for (const point of history) {
      const value = readSeriesValue(point, series.metric, definition.unit);
      if (value === null) continue;
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
      latest = value;
    }
    if (latest === null) {
      description += `${series.label} sans donnee. `;
    } else {
      description += `${series.label} minimum ${formatSeriesValue(minimum, definition.unit)}, maximum ${formatSeriesValue(maximum, definition.unit)}, derniere ${formatSeriesValue(latest, definition.unit)}. `;
    }
  }
  return description.trim();
}

// ----------------------------------------------------------------------------
// Formate une valeur de serie avec son unite lisible.
//
// Parametres :
// - value : valeur deja convertie pour l'affichage.
// - unit : unite du graphique.
//
// Retour :
// - valeur arrondie et unite.
// ----------------------------------------------------------------------------
function formatSeriesValue(value: number, unit: DiagnosticsUnit): string {
  if (unit === "bytes") return `${value.toFixed(0)} octets`;
  if (unit === "milliseconds") return `${value.toFixed(2)} ms`;
  return `${value.toFixed(1)} FPS`;
}

// ----------------------------------------------------------------------------
// Formate une graduation verticale compacte.
//
// Parametres :
// - value : valeur convertie du domaine.
// - unit : unite du graphique.
//
// Retour :
// - libelle court adapte a l'axe.
// ----------------------------------------------------------------------------
function formatAxisValue(value: number, unit: DiagnosticsUnit): string {
  if (unit === "bytes") return `${(value / 1_024).toFixed(1)}`;
  if (unit === "milliseconds") return value.toFixed(1);
  return value.toFixed(1);
}

// ----------------------------------------------------------------------------
// Formate un instant en heure locale francaise avec les secondes.
//
// Parametres :
// - timestamp : instant Unix en millisecondes.
//
// Retour :
// - heure locale courte.
// ----------------------------------------------------------------------------
function formatLocalTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ----------------------------------------------------------------------------
// Arrondit une coordonnee SVG pour limiter la taille du fragment genere.
//
// Parametres :
// - value : coordonnee logique complete.
//
// Retour :
// - coordonnee arrondie au dixieme de pixel.
// ----------------------------------------------------------------------------
function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

// ----------------------------------------------------------------------------
// Echappe une valeur destinee au contenu HTML ou SVG.
//
// Parametres :
// - value : texte non fiable a encoder.
//
// Retour :
// - texte sans caracteres de balisage actifs.
// ----------------------------------------------------------------------------
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ----------------------------------------------------------------------------
// Echappe une valeur destinee a un attribut HTML ou SVG.
//
// Parametres :
// - value : texte non fiable a encoder.
//
// Retour :
// - texte protege pour un attribut entre guillemets.
// ----------------------------------------------------------------------------
function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
