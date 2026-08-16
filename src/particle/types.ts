// ============================================================================
// ParticleTypes - Implementation des types Particle Cloud
// ----------------------------------------------------------------------------
// Ce fichier decrit les contrats de donnees Particle utilises par l'application.
// Il ne lance aucun appel reseau et ne depend pas de l'interface utilisateur.
// ============================================================================

export interface ParticleDeviceSummary {
  id: string;
  name: string;
  connected: boolean;
  online?: boolean;
  platform_id?: number;
  product_id?: number;
}
