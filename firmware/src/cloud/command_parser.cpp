// ============================================================================
// CommandParser - Implementation des adaptateurs Particle Cloud historiques
// ----------------------------------------------------------------------------
// Ce module convertit les String imposees par Particle en vues de buffers. La
// validation et les effets metier restent dans le module CommandDispatch.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Adapte la fonction Particle SetMode a la commande metier bornee.
//
// Parametres :
// - command : commande historique fournie par Device OS.
//
// Retour :
// - resultat historique de la commande ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - delegue integralement la validation et l'application a setModeFromBuffer().
// ----------------------------------------------------------------------------
int SetMode(String command) {
    return recordCommandResult(
        setModeFromBuffer(command.c_str(), command.length()));
}

// ----------------------------------------------------------------------------
// Adapte la fonction Particle generique au routeur metier borne.
//
// Parametres :
// - command : commande historique fournie par Device OS.
//
// Retour :
// - resultat historique de la commande ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - delegue integralement le routage a routeCommandFromBuffer().
// ----------------------------------------------------------------------------
int FnRouter(String command) {
    return recordCommandResult(
        routeCommandFromBuffer(command.c_str(), command.length()));
}

// ----------------------------------------------------------------------------
// Adapte la fonction Particle SetText au stockage texte borne.
//
// Parametres :
// - command : texte fourni par Device OS.
//
// Retour :
// - un en cas de succes ou COMMAND_ERROR_TOO_LONG si le texte depasse.
//
// Effet de bord :
// - delegue la lecture et l'ecriture EEPROM a setTextFromBuffer().
// ----------------------------------------------------------------------------
int SetText(String command) {
    return recordCommandResult(
        setTextFromBuffer(command.c_str(), command.length()));
}

#endif
