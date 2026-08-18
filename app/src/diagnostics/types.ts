// ============================================================================
// DiagnosticsTypes - Declaration du suivi applicatif des KPI
// ----------------------------------------------------------------------------
// Ce fichier decrit les echantillons enrichis et l'etat du moniteur. Il ne
// lance aucun timer, appel reseau ou rendu DOM.
// ============================================================================

import type { LanDiagnostics } from "../lan/types";
import type { TransportKind } from "../transport/types";

export interface DiagnosticsSample {
  capturedAtMilliseconds: number;
  source: TransportKind;
  latencyMilliseconds: number;
  dataOperations: number;
  diagnostics: LanDiagnostics;
}

export interface DiagnosticsMonitorState {
  enabled: boolean;
  intervalSeconds: number;
  latestSample: DiagnosticsSample | null;
  history: DiagnosticsSample[];
  lastError: string | null;
  consecutiveErrors: number;
  estimatedParticleDataOperations: number;
  warningMessage: string | null;
}
