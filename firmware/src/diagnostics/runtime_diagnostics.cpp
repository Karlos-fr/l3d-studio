// ============================================================================
// RuntimeDiagnostics - Implementation des diagnostics runtime bornes
// ----------------------------------------------------------------------------
// Ce module collecte des entiers statiques et produit un instantane dans un
// buffer fourni. Il ne publie rien et n'alloue aucune memoire dynamique.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_DIAGNOSTICS_ENABLED

// Etat entier durable de l'instrumentation runtime.
struct RuntimeDiagnosticsState {
    uint32_t startupFreeMemory;
    uint32_t minimumFreeMemory;
    uint32_t frameMemoryBefore;
    uint32_t frameMemoryAfter;
    uint32_t modeMinimumFreeMemory;
    uint32_t frameStartedMicros;
    uint32_t lastFrameMicros;
    uint32_t averageFrameMicros;
    uint32_t worstFrameMicros;
    uint32_t frameCount;
    uint32_t modeChangeCount;
    uint32_t resetReasonData;
    int16_t modeId;
    int16_t resetReason;
};

// Mesures runtime exposees par le serveur LAN.
static RuntimeDiagnosticsState runtimeDiagnostics = {};

// Taille de la derniere allocation refusee, modifiable par le handler systeme.
static volatile int diagnosticsOutOfMemoryBytes = -1;

// Nombre d'evenements memoire recus depuis le demarrage.
static volatile uint32_t diagnosticsOutOfMemoryCount = 0;

// ----------------------------------------------------------------------------
// Integre une mesure libre dans les minimums global et du mode.
//
// Parametres :
// - freeMemory : nombre d'octets libres nouvellement observe.
//
// Effet de bord :
// - peut abaisser les deux minimums conserves.
// ----------------------------------------------------------------------------
static void diagnosticsObserveMemory(uint32_t freeMemory) {
    if(runtimeDiagnostics.minimumFreeMemory == 0 ||
       freeMemory < runtimeDiagnostics.minimumFreeMemory)
        runtimeDiagnostics.minimumFreeMemory = freeMemory;
    if(runtimeDiagnostics.modeMinimumFreeMemory == 0 ||
       freeMemory < runtimeDiagnostics.modeMinimumFreeMemory)
        runtimeDiagnostics.modeMinimumFreeMemory = freeMemory;
}

// ----------------------------------------------------------------------------
// Reinitialise les compteurs propres au mode fourni.
//
// Parametres :
// - modeId : ID historique du mode qui devient la reference.
//
// Effet de bord :
// - efface les statistiques de frame et mesure la memoire libre courante.
// ----------------------------------------------------------------------------
static void diagnosticsResetModeStats(int modeId) {
    runtimeDiagnostics.modeId = modeId;
    runtimeDiagnostics.frameMemoryBefore = 0;
    runtimeDiagnostics.frameMemoryAfter = 0;
    runtimeDiagnostics.modeMinimumFreeMemory = System.freeMemory();
    runtimeDiagnostics.lastFrameMicros = 0;
    runtimeDiagnostics.averageFrameMicros = 0;
    runtimeDiagnostics.worstFrameMicros = 0;
    runtimeDiagnostics.frameCount = 0;
    diagnosticsObserveMemory(runtimeDiagnostics.modeMinimumFreeMemory);
}

// ----------------------------------------------------------------------------
// Reinitialise les minimums globaux et les statistiques du mode courant.
//
// Effet de bord :
// - remplace les minimums historiques par la memoire libre courante.
// ----------------------------------------------------------------------------
static void diagnosticsResetStatistics(void) {
    uint32_t freeMemory = System.freeMemory();
    runtimeDiagnostics.minimumFreeMemory = freeMemory;
    diagnosticsResetModeStats(currentModeID);
}

// ----------------------------------------------------------------------------
// Memorise un refus d'allocation sans effectuer de traitement complexe.
//
// Parametres :
// - event : evenement systeme recu, sans lecture necessaire.
// - param : taille de l'allocation refusee.
//
// Effet de bord :
// - actualise deux compteurs volatils uniquement.
// ----------------------------------------------------------------------------
static void outOfMemoryHandler(system_event_t event, int param) {
    (void)event;
    diagnosticsOutOfMemoryBytes = param;
    diagnosticsOutOfMemoryCount++;
}

// ----------------------------------------------------------------------------
// Initialise la cause de reset et le handler memoire avant le reste du setup.
//
// Effet de bord :
// - active FEATURE_RESET_INFO et enregistre un handler systeme minimal.
// ----------------------------------------------------------------------------
void diagnosticsSetupEarly(void) {
    runtimeDiagnostics.modeId = -1;
    runtimeDiagnostics.resetReason = -1;
    diagnosticsOutOfMemoryBytes = -1;
    diagnosticsOutOfMemoryCount = 0;

    System.enableFeature(FEATURE_RESET_INFO);
    runtimeDiagnostics.resetReason = static_cast<int16_t>(System.resetReason());
    runtimeDiagnostics.resetReasonData = System.resetReasonData();
    System.on(out_of_memory, outOfMemoryHandler);
}

// ----------------------------------------------------------------------------
// Capture la memoire disponible une fois l'initialisation terminee.
//
// Parametres :
// - modeId : ID historique du premier mode actif.
//
// Effet de bord :
// - initialise les minimums globaux et les compteurs du mode.
// ----------------------------------------------------------------------------
void diagnosticsSetupComplete(int modeId) {
    runtimeDiagnostics.startupFreeMemory = System.freeMemory();
    runtimeDiagnostics.minimumFreeMemory = runtimeDiagnostics.startupFreeMemory;
    diagnosticsResetModeStats(modeId);
}

// ----------------------------------------------------------------------------
// Produit un instantane compact dans le buffer fourni par le transport.
//
// Parametres :
// - destination : buffer recevant une chaine terminee par un caractere nul.
// - capacity : capacite totale du buffer, terminaison comprise.
// - resetRequested : vrai pour reinitialiser les statistiques avant la mesure.
// - sequence : numero associe a cet instantane.
//
// Retour :
// - longueur utile produite ou moins un si le buffer est invalide ou trop petit.
//
// Effet de bord :
// - observe la memoire libre et peut reinitialiser les statistiques demandees.
// ----------------------------------------------------------------------------
int diagnosticsWriteSnapshot(
        char* destination,
        size_t capacity,
        bool resetRequested,
        int32_t sequence) {
    if(destination == NULL || capacity == 0)
        return -1;
    if(resetRequested)
        diagnosticsResetStatistics();

    uint32_t freeMemory = System.freeMemory();
    diagnosticsObserveMemory(freeMemory);

    uint32_t fpsTimesTen = 0;
    if(runtimeDiagnostics.averageFrameMicros > 0)
        fpsTimesTen = 10000000UL / runtimeDiagnostics.averageFrameMicros;

    int length = snprintf(
        destination,
        capacity,
        "v=%d,y=%ld,m=%d,u=%lu,r=%d,d=%lu,s=%lu,f=%lu,n=%lu,b=%lu,a=%lu,q=%lu,c=%lu,l=%lu,g=%lu,w=%lu,p=%lu,x=%lu,i=%d,k=%d,o=%d,z=%lu",
        DIAGNOSTICS_FORMAT_VERSION,
        static_cast<long>(sequence),
        runtimeDiagnostics.modeId,
        millis() / 1000UL,
        runtimeDiagnostics.resetReason,
        runtimeDiagnostics.resetReasonData,
        runtimeDiagnostics.startupFreeMemory,
        freeMemory,
        runtimeDiagnostics.minimumFreeMemory,
        runtimeDiagnostics.frameMemoryBefore,
        runtimeDiagnostics.frameMemoryAfter,
        runtimeDiagnostics.modeMinimumFreeMemory,
        runtimeDiagnostics.frameCount,
        runtimeDiagnostics.lastFrameMicros,
        runtimeDiagnostics.averageFrameMicros,
        runtimeDiagnostics.worstFrameMicros,
        fpsTimesTen,
        runtimeDiagnostics.modeChangeCount,
        WiFi.ready() ? 1 : 0,
        Particle.connected() ? 1 : 0,
        diagnosticsOutOfMemoryBytes,
        diagnosticsOutOfMemoryCount);
    if(length < 0 || static_cast<size_t>(length) >= capacity) {
        destination[0] = '\0';
        return -1;
    }
    return length;
}

// ----------------------------------------------------------------------------
// Capture le debut d'une frame et detecte un changement de mode implicite.
//
// Parametres :
// - modeId : ID historique de la frame qui commence.
//
// Effet de bord :
// - actualise la memoire avant frame et son horodatage.
// ----------------------------------------------------------------------------
void diagnosticsBeginFrame(int modeId) {
    if(runtimeDiagnostics.modeId != modeId) {
        runtimeDiagnostics.modeChangeCount++;
        diagnosticsResetModeStats(modeId);
    }

    runtimeDiagnostics.frameMemoryBefore = System.freeMemory();
    diagnosticsObserveMemory(runtimeDiagnostics.frameMemoryBefore);
    runtimeDiagnostics.frameStartedMicros = micros();
}

// ----------------------------------------------------------------------------
// Termine la mesure de frame et actualise moyenne, pire duree et memoire.
//
// Effet de bord :
// - incremente le compteur de frames et tous les agregats correspondants.
// ----------------------------------------------------------------------------
void diagnosticsEndFrame(void) {
    uint32_t frameMicros = micros() - runtimeDiagnostics.frameStartedMicros;
    runtimeDiagnostics.frameMemoryAfter = System.freeMemory();
    diagnosticsObserveMemory(runtimeDiagnostics.frameMemoryAfter);

    runtimeDiagnostics.lastFrameMicros = frameMicros;
    runtimeDiagnostics.frameCount++;

    if(runtimeDiagnostics.frameCount == 1) {
        runtimeDiagnostics.averageFrameMicros = frameMicros;
    }
    else if(frameMicros >= runtimeDiagnostics.averageFrameMicros) {
        runtimeDiagnostics.averageFrameMicros +=
            (frameMicros - runtimeDiagnostics.averageFrameMicros) /
            runtimeDiagnostics.frameCount;
    }
    else {
        runtimeDiagnostics.averageFrameMicros -=
            (runtimeDiagnostics.averageFrameMicros - frameMicros) /
            runtimeDiagnostics.frameCount;
    }

    if(frameMicros > runtimeDiagnostics.worstFrameMicros)
        runtimeDiagnostics.worstFrameMicros = frameMicros;
}

// ----------------------------------------------------------------------------
// Signale un changement de mode applique hors de la detection de frame.
//
// Parametres :
// - modeId : ID historique du nouveau mode.
//
// Effet de bord :
// - incremente le compteur global et remet les statistiques du mode a zero.
// ----------------------------------------------------------------------------
void diagnosticsModeChanged(int modeId) {
    runtimeDiagnostics.modeChangeCount++;
    diagnosticsResetModeStats(modeId);
}

#endif

#endif
