// ============================================================================
// SparkPixelsProtocol - Implementation du protocole Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier construira les commandes envoyees au firmware SparkPixelsMega. Il
// ne doit pas contenir d'appels Particle Cloud ni de logique de rendu DOM.
// ============================================================================

// Nombre minimal de couleurs adressables par une commande de mode.
export const MIN_MODE_COLOR_COUNT = 0;

// Nombre maximal de couleurs supportees par le firmware SparkPixelsMega.
export const MAX_MODE_COLOR_COUNT = 6;
