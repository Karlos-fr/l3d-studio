// ============================================================================
// UiState - Implementation de l'etat applicatif minimal
// ----------------------------------------------------------------------------
// Ce fichier decrit l'etat necessaire au rendu initial. Il ne lit pas Particle
// Cloud et ne construit pas de commande firmware.
// ============================================================================

export interface AppState {
  applicationName: string;
  connectionStatus: string;
}

// Nom affiche dans l'en-tete de l'application.
const APPLICATION_NAME = "L3D Studio";

// Statut initial affiche avant toute connexion Particle.
const INITIAL_CONNECTION_STATUS = "Non connecte";

// ----------------------------------------------------------------------------
// Cree l'etat initial de la coquille applicative.
//
// Retour :
// - etat minimal utilise par le premier rendu.
// ----------------------------------------------------------------------------
export function createInitialState(): AppState {
  return {
    applicationName: APPLICATION_NAME,
    connectionStatus: INITIAL_CONNECTION_STATUS,
  };
}
