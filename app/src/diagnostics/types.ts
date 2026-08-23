// ============================================================================
// DiagnosticsTypes - Declaration du suivi applicatif des KPI
// ----------------------------------------------------------------------------
// Ce fichier decrit les echantillons enrichis et l'etat du moniteur. Il ne
// lance aucun timer, appel reseau ou rendu DOM.
// ============================================================================

import type { LanDiagnostics } from "../lan/types";
import type { TransportKind } from "../transport/types";
import type { CircularBuffer } from "./circular_buffer";

export type DiagnosticsChartWindow = "recent" | "all";

export type DiagnosticsBreakReason = "interruption" | "restart" | null;

export interface DiagnosticsSample {
  capturedAtMilliseconds: number;
  source: TransportKind;
  latencyMilliseconds: number;
  diagnostics: LanDiagnostics;
}

export interface DiagnosticsHistoryPoint {
  sample: DiagnosticsSample;
  breakReason: DiagnosticsBreakReason;
  modeChanged: boolean;
  outOfMemoryOccurred: boolean;
}

export interface DiagnosticsMonitorState {
  enabled: boolean;
  intervalSeconds: number;
  latestSample: DiagnosticsSample | null;
  history: CircularBuffer<DiagnosticsHistoryPoint>;
  chartWindow: DiagnosticsChartWindow;
  lastError: string | null;
  consecutiveErrors: number;
  warningMessage: string | null;
}
