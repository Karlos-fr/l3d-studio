// ============================================================================
// AnimationScheduler - Implementation de l'ordonnanceur cooperatif
// ----------------------------------------------------------------------------
// Ce module ne connait aucune animation. Il protege leur etat partage lors des
// callbacks Particle et remplace les attentes opaques par des attentes servies.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Aucun changement de mode n'est en attente.
const int ANIMATION_PENDING_MODE_NONE = -1;

// Un cycle de rendu utilise actuellement l'etat partage.
static bool animationCycleActive = FALSE;

// Particle.process() peut actuellement appeler une fonction Cloud.
static bool animationCloudCallbackWindow = FALSE;

// Index du dernier mode demande pendant la fenetre Cloud courante.
static int animationPendingModeIndex = ANIMATION_PENDING_MODE_NONE;

// Intervalle maximal entre deux traitements Particle pendant une attente.
const uint32_t ANIMATION_CLOUD_SERVICE_INTERVAL_MS = 20UL;

// ----------------------------------------------------------------------------
// Marque le debut d'un cycle de rendu susceptible d'utiliser l'etat partage.
//
// Effet de bord :
// - active la protection contre les changements Cloud immediats.
// ----------------------------------------------------------------------------
void animationSchedulerBeginCycle(void) {
    animationCycleActive = TRUE;
}

// ----------------------------------------------------------------------------
// Termine un cycle et applique le changement de mode Cloud eventuellement differe.
//
// Effet de bord :
// - appelle setNewMode hors de la pile de l'ancienne animation.
// ----------------------------------------------------------------------------
void animationSchedulerFinishCycle(void) {
    animationCycleActive = FALSE;
    if(animationPendingModeIndex == ANIMATION_PENDING_MODE_NONE)
        return;

    int modeIndex = animationPendingModeIndex;
    animationPendingModeIndex = ANIMATION_PENDING_MODE_NONE;
    setNewMode(modeIndex);
}

// ----------------------------------------------------------------------------
// Enregistre un changement de mode lorsqu'un callback Cloud interrompt un rendu.
//
// Parametres :
// - modeIndex : index valide dans modeStruct.
//
// Retour :
// - vrai si la demande est differee, faux hors d'un rendu interrompu.
//
// Effet de bord :
// - conserve la derniere demande et positionne les drapeaux d'arret historiques.
// ----------------------------------------------------------------------------
bool animationSchedulerDeferModeChange(int modeIndex) {
    if(!animationCycleActive || !animationCloudCallbackWindow)
        return false;

    animationPendingModeIndex = modeIndex;
    stop = TRUE;
    stopDemo = TRUE;
    return true;
}

// ----------------------------------------------------------------------------
// Traite les evenements Particle en identifiant la duree du callback Cloud.
//
// Effet de bord :
// - encadre Particle.process afin que setNewMode puisse differer son action.
// ----------------------------------------------------------------------------
void animationProcessCloud(void) {
    animationCloudCallbackWindow = TRUE;
    Particle.process();
    animationCloudCallbackWindow = FALSE;
}

// ----------------------------------------------------------------------------
// Attend une duree historique tout en servant Particle Cloud.
//
// Parametres :
// - durationMillis : attente maximale en millisecondes.
//
// Effet de bord :
// - sert Device OS par tranches bornees et sort sur changement differe.
// ----------------------------------------------------------------------------
void animationCooperativeDelay(uint32_t durationMillis) {
    uint32_t startedAt = millis();
    while(static_cast<uint32_t>(millis() - startedAt) < durationMillis) {
        animationCloudCallbackWindow = TRUE;
        Particle.process();
        animationCloudCallbackWindow = FALSE;
        if(animationPendingModeIndex != ANIMATION_PENDING_MODE_NONE)
            return;

        uint32_t elapsedMillis = static_cast<uint32_t>(millis() - startedAt);
        if(elapsedMillis >= durationMillis)
            return;

        uint32_t remainingMillis = durationMillis - elapsedMillis;
        uint32_t waitSliceMillis = remainingMillis;
        if(waitSliceMillis > ANIMATION_CLOUD_SERVICE_INTERVAL_MS)
            waitSliceMillis = ANIMATION_CLOUD_SERVICE_INTERVAL_MS;

        // La pause native borne la charge CPU entre deux services Cloud. La
        // fenetre reste active si Device OS livre un callback pendant ce temps.
        animationCloudCallbackWindow = TRUE;
        delay(waitSliceMillis);
        animationCloudCallbackWindow = FALSE;
        if(animationPendingModeIndex != ANIMATION_PENDING_MODE_NONE)
            return;
    }
}

#endif
