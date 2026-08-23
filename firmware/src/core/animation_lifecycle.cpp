// ============================================================================
// AnimationLifecycle - Implementation du cycle de vie des modes
// ----------------------------------------------------------------------------
// Ce module centralise les frontieres enter, tick et exit. Les initialisations
// visuelles restent dans ModeRuntime et les sockets dans leurs modules reseau.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Aucun mode ne possede la zone mutualisee avant la fin du demarrage.
const int ANIMATION_OWNER_NONE = -1;

// Identifiant du mode autorise a utiliser la zone d'etat partagee.
static int activeAnimationModeId = ANIMATION_OWNER_NONE;

// ----------------------------------------------------------------------------
// Initialise le proprietaire logique et l'etat du mode charge au demarrage.
//
// Parametres :
// - modeId : identifiant historique du mode charge depuis l'EEPROM.
//
// Effet de bord :
// - delegue l'initialisation complete a animationEnter().
// ----------------------------------------------------------------------------
void animationLifecycleStart(int modeId) {
    activeAnimationModeId = ANIMATION_OWNER_NONE;
    animationEnter(modeId);
}

// ----------------------------------------------------------------------------
// Quitte le mode actif et ferme ses ressources reseau eventuelles.
//
// Parametres :
// - modeId : identifiant du mode a quitter.
//
// Effet de bord :
// - ferme TCP ou UDP puis invalide immediatement la zone mutualisee.
// ----------------------------------------------------------------------------
void animationExit(int modeId) {
    if(modeId == STREAM)
        streamExit();
#if L3D_BYTECODE_ENABLED
    if(modeId == BYTECODE)
        bytecodeExit();
#endif
    if(modeId == CHEERLIGHTS) {
        client.stop();
        connected = FALSE;
        resetCheerLightsResponse();
    }
#if L3D_LISTENER_ENABLED
    if(modeId == LISTENER) {
        Udp.stop();
        maximum_received_packet = 0;
        countdown = 0;
    }
#endif
    activeAnimationModeId = ANIMATION_OWNER_NONE;
}

// ----------------------------------------------------------------------------
// Entre dans un mode et initialise entierement son etat.
//
// Parametres :
// - modeId : identifiant du mode a initialiser.
//
// Effet de bord :
// - attribue la zone partagee avant la reinitialisation du mode.
// ----------------------------------------------------------------------------
void animationEnter(int modeId) {
    activeAnimationModeId = modeId;
    if(modeId == STREAM) {
        streamEnter();
        return;
    }
#if L3D_BYTECODE_ENABLED
    if(modeId == BYTECODE) {
        bytecodeEnter();
        return;
    }
#endif
    resetVariables(modeId);
}

// ----------------------------------------------------------------------------
// Execute une frame du mode actuellement proprietaire de son etat.
//
// Effet de bord :
// - reinitialise le mode si son identifiant a ete modifie hors du cycle normal.
// ----------------------------------------------------------------------------
void animationTick(void) {
    if(activeAnimationModeId != currentModeID) {
        animationExit(activeAnimationModeId);
        animationEnter(currentModeID);
    }
    runMode();
}

#endif
