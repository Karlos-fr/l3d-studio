// ============================================================================
// DiagnosticsChartsTest - Tests du modele et du rendu SVG des KPI
// ----------------------------------------------------------------------------
// Ce fichier verifie echelles, conversions, ruptures et bornes de rendu. Il ne
// cree aucun DOM et ne lance aucun appel reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  convertFpsTimesTen,
  convertMicrosToMilliseconds,
  createLinearScale,
  limitRenderedPoints,
  MAX_RENDERED_DIAGNOSTICS_POINTS,
  projectLinearValue,
  renderDiagnosticsCharts,
  selectDiagnosticsWindow,
} from "./charts";
import type { DiagnosticsHistoryPoint, DiagnosticsSample } from "./types";

// ----------------------------------------------------------------------------
// Execute les tests des graphiques de diagnostics.
// ----------------------------------------------------------------------------
function runDiagnosticsChartsTests(): void {
  // --------------------------------------------------------------------------
  // Verifie les domaines constants, extremes et les valeurs manquantes.
  // --------------------------------------------------------------------------
  it("construit des echelles finies pour tous les domaines", () => {
    const constantScale = createLinearScale([5, 5], 100, 0);
    const extremeScale = createLinearScale([-1_000_000, 1_000_000], 0, 200);
    const missingScale = createLinearScale([null, Number.NaN], 0, 10);

    expect(constantScale.domainMinimum).toBeLessThan(5);
    expect(constantScale.domainMaximum).toBeGreaterThan(5);
    expect(projectLinearValue(extremeScale, 0)).toBeCloseTo(100);
    expect(projectLinearValue(missingScale, 0.5)).toBeCloseTo(5);
  });

  // --------------------------------------------------------------------------
  // Verifie les conversions sans alteration des valeurs firmware sources.
  // --------------------------------------------------------------------------
  it("convertit microsecondes et dixiemes de FPS", () => {
    expect(convertMicrosToMilliseconds(12_345)).toBe(12.345);
    expect(convertFpsTimesTen(599)).toBe(59.9);
  });

  // --------------------------------------------------------------------------
  // Verifie la fenetre courte relative au dernier point disponible.
  // --------------------------------------------------------------------------
  it("selectionne les cinq dernieres minutes", () => {
    const history = [
      createHistoryPoint(0),
      createHistoryPoint(60_000),
      createHistoryPoint(360_000),
    ];

    expect(selectDiagnosticsWindow(history, "recent")).toHaveLength(2);
    expect(selectDiagnosticsWindow(history, "all")).toHaveLength(3);
  });

  // --------------------------------------------------------------------------
  // Verifie le rendu vide, ponctuel et la rupture explicite des chemins.
  // --------------------------------------------------------------------------
  it("rend historique vide, point unique et rupture de serie", () => {
    expect(renderDiagnosticsCharts([], "all")).toContain("Aucune donnee");
    const onePoint = renderDiagnosticsCharts([createHistoryPoint(1_000)], "all");
    expect(onePoint).toContain("<svg");
    expect(onePoint).toContain("minimum");

    const interruptedPoint = createHistoryPoint(2_000);
    interruptedPoint.breakReason = "interruption";
    const twoPoints = renderDiagnosticsCharts(
      [createHistoryPoint(1_000), interruptedPoint],
      "all",
    );
    expect(twoPoints).toMatch(/d="M[^\"]+ M[^\"]+"/);
    expect(twoPoints).toContain("Interruption de collecte");
  });

  // --------------------------------------------------------------------------
  // Verifie le plafond SVG et la conservation des evenements remarquables.
  // --------------------------------------------------------------------------
  it("limite les points rendus a la capacite graphique", () => {
    const history: DiagnosticsHistoryPoint[] = [];
    for (let index = 0; index < 360; index += 1) {
      history.push(createHistoryPoint(index * 1_000));
    }
    history[200]!.outOfMemoryOccurred = true;

    const selected = limitRenderedPoints(history);
    expect(selected.length).toBeLessThanOrEqual(MAX_RENDERED_DIAGNOSTICS_POINTS);
    expect(selected.some(hasOutOfMemoryMarker)).toBe(true);
    const html = renderDiagnosticsCharts(history, "all");
    expect(countOccurrences(html, "data-chart-point")).toBeLessThanOrEqual(
      MAX_RENDERED_DIAGNOSTICS_POINTS * 3,
    );
  });

  // --------------------------------------------------------------------------
  // Verifie axes, legendes, alternatives et points accessibles.
  // --------------------------------------------------------------------------
  it("fournit les informations visuelles et textuelles attendues", () => {
    const point = createHistoryPoint(1_000);
    point.modeChanged = true;
    const html = renderDiagnosticsCharts([point], "all");

    expect(html).toContain("Memoire (Kio)");
    expect(html).toContain("data-tooltip=");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Mode 1");
    expect(html).toContain("derniere");
  });

  // --------------------------------------------------------------------------
  // Verifie les viewBox recalcules pour un conteneur etroit ou large.
  // --------------------------------------------------------------------------
  it("adapte le repere SVG aux largeurs mobile et bureau", () => {
    const history = [createHistoryPoint(1_000)];

    expect(renderDiagnosticsCharts(history, "all", 320)).toContain(
      'viewBox="0 0 320 190"',
    );
    expect(renderDiagnosticsCharts(history, "all", 1_024)).toContain(
      'viewBox="0 0 328 190"',
    );
  });
}

// ----------------------------------------------------------------------------
// Indique si un point porte un marqueur OOM.
//
// Parametres :
// - point : point historique inspecte.
//
// Retour :
// - vrai lorsque le compteur OOM a progresse.
// ----------------------------------------------------------------------------
function hasOutOfMemoryMarker(point: DiagnosticsHistoryPoint): boolean {
  return point.outOfMemoryOccurred;
}

// ----------------------------------------------------------------------------
// Compte les occurrences exactes d'un fragment dans une chaine.
//
// Parametres :
// - value : chaine complete.
// - fragment : fragment non vide recherche.
//
// Retour :
// - nombre d'occurrences non superposees.
// ----------------------------------------------------------------------------
function countOccurrences(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

// ----------------------------------------------------------------------------
// Cree un point historique representatif pour les tests SVG.
//
// Parametres :
// - capturedAtMilliseconds : instant du point.
//
// Retour :
// - point complet sans rupture ni evenement par defaut.
// ----------------------------------------------------------------------------
function createHistoryPoint(capturedAtMilliseconds: number): DiagnosticsHistoryPoint {
  return {
    sample: createSample(capturedAtMilliseconds),
    breakReason: null,
    modeChanged: false,
    outOfMemoryOccurred: false,
  };
}

// ----------------------------------------------------------------------------
// Cree un echantillon brut complet pour les tests SVG.
//
// Parametres :
// - capturedAtMilliseconds : instant du point.
//
// Retour :
// - echantillon dont les valeurs permettent de tracer les trois graphiques.
// ----------------------------------------------------------------------------
function createSample(capturedAtMilliseconds: number): DiagnosticsSample {
  return {
    capturedAtMilliseconds,
    source: "lan",
    latencyMilliseconds: 2,
    diagnostics: {
      formatVersion: 1,
      sequence: capturedAtMilliseconds,
      modeId: 1,
      uptimeSeconds: capturedAtMilliseconds / 1_000,
      resetReason: 0,
      resetReasonData: 0,
      startupFreeMemory: 34_000,
      freeMemory: 33_000,
      minimumFreeMemory: 32_000,
      frameMemoryBefore: 33_000,
      frameMemoryAfter: 33_000,
      modeMinimumFreeMemory: 31_000,
      frameCount: 1,
      lastFrameMicros: 10_000,
      averageFrameMicros: 11_000,
      worstFrameMicros: 15_000,
      fpsTimesTen: 600,
      modeChangeCount: 1,
      wifiReady: true,
      particleConnected: true,
      lastOutOfMemoryBytes: -1,
      outOfMemoryCount: 0,
    },
  };
}

describe("graphiques de diagnostics", runDiagnosticsChartsTests);
