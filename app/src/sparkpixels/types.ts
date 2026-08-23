// ============================================================================
// SparkPixelsTypes - Implementation des types Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier decrit les types du protocole firmware. Il ne depend ni du client
// Particle Cloud ni des modules de rendu.
// ============================================================================

export interface SparkPixelsModeSummary {
  name: string;
  index: number;
}

export interface SparkPixelsModeParameters {
  colorCount: number;
  switchLabels: string[];
  acceptsText: boolean;
  raw: string;
}

export interface SparkPixelsModeDefinition extends SparkPixelsModeSummary {
  parameters: SparkPixelsModeParameters;
}

export interface SparkPixelsAuxSwitch {
  id: number;
  title: string;
  onName: string;
  offName: string;
  enabled: boolean;
  raw: string;
}

export interface SparkPixelsSetModeOptions {
  modeName?: string;
  speedIndex?: number;
  brightnessPercent?: number;
  colors?: string[];
  switches?: boolean[];
  text?: string;
}
