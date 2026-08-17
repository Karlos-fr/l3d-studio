#ifdef L3D_UNITY_BUILD

#if L3D_DIAGNOSTICS_ENABLED

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

static RuntimeDiagnosticsState runtimeDiagnostics = {};
static volatile int diagnosticsOutOfMemoryBytes = -1;
static volatile uint32_t diagnosticsOutOfMemoryCount = 0;
static volatile bool diagnosticsRefreshRequested = false;
static volatile bool diagnosticsResetRequested = false;
static volatile int diagnosticsRequestSequence = 0;
static int diagnosticsResponseSequence = 0;
static uint32_t diagnosticsTextValidUntil = 0;

static void diagnosticsObserveMemory(uint32_t freeMemory) {
    if(runtimeDiagnostics.minimumFreeMemory == 0 || freeMemory < runtimeDiagnostics.minimumFreeMemory)
        runtimeDiagnostics.minimumFreeMemory = freeMemory;
    if(runtimeDiagnostics.modeMinimumFreeMemory == 0 || freeMemory < runtimeDiagnostics.modeMinimumFreeMemory)
        runtimeDiagnostics.modeMinimumFreeMemory = freeMemory;
}

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

static void outOfMemoryHandler(system_event_t event, int param) {
    diagnosticsOutOfMemoryBytes = param;
    diagnosticsOutOfMemoryCount++;
}

static void diagnosticsRefreshText(void) {
    uint32_t freeMemory = System.freeMemory();
    diagnosticsObserveMemory(freeMemory);

    uint32_t fpsTimesTen = 0;
    if(runtimeDiagnostics.averageFrameMicros > 0)
        fpsTimesTen = 10000000UL / runtimeDiagnostics.averageFrameMicros;

    snprintf(diagnosticsText, DIAGNOSTICS_TEXT_LENGTH,
        "v=1,y=%d,m=%d,u=%lu,r=%d,d=%lu,s=%lu,f=%lu,n=%lu,b=%lu,a=%lu,q=%lu,c=%lu,l=%lu,g=%lu,w=%lu,p=%lu,x=%lu,i=%d,k=%d,o=%d,z=%lu",
        diagnosticsResponseSequence,
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
}

void diagnosticsSetupEarly(void) {
    runtimeDiagnostics.modeId = -1;
    runtimeDiagnostics.resetReason = -1;
    diagnosticsOutOfMemoryBytes = -1;
    diagnosticsOutOfMemoryCount = 0;

    System.enableFeature(FEATURE_RESET_INFO);
    runtimeDiagnostics.resetReason = (int16_t)System.resetReason();
    runtimeDiagnostics.resetReasonData = System.resetReasonData();
    System.on(out_of_memory, outOfMemoryHandler);
}

void diagnosticsSetupComplete(int modeId) {
    runtimeDiagnostics.startupFreeMemory = System.freeMemory();
    runtimeDiagnostics.minimumFreeMemory = runtimeDiagnostics.startupFreeMemory;
    diagnosticsResetModeStats(modeId);
}

void diagnosticsProcessRequests(void) {
    if(!diagnosticsRefreshRequested)
        return;

    bool resetRequested = diagnosticsResetRequested;
    diagnosticsRefreshRequested = false;
    diagnosticsResetRequested = false;

    if(resetRequested) {
        uint32_t freeMemory = System.freeMemory();
        runtimeDiagnostics.minimumFreeMemory = freeMemory;
        diagnosticsResetModeStats(currentModeID);
    }

    diagnosticsResponseSequence = diagnosticsRequestSequence;
    diagnosticsRefreshText();
    diagnosticsTextValidUntil = millis() + 15000UL;
}

void diagnosticsBeginFrame(int modeId) {
    if(runtimeDiagnostics.modeId != modeId) {
        runtimeDiagnostics.modeChangeCount++;
        diagnosticsResetModeStats(modeId);
    }

    runtimeDiagnostics.frameMemoryBefore = System.freeMemory();
    diagnosticsObserveMemory(runtimeDiagnostics.frameMemoryBefore);
    runtimeDiagnostics.frameStartedMicros = micros();
}

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
            (frameMicros - runtimeDiagnostics.averageFrameMicros) / runtimeDiagnostics.frameCount;
    }
    else {
        runtimeDiagnostics.averageFrameMicros -=
            (runtimeDiagnostics.averageFrameMicros - frameMicros) / runtimeDiagnostics.frameCount;
    }

    if(frameMicros > runtimeDiagnostics.worstFrameMicros)
        runtimeDiagnostics.worstFrameMicros = frameMicros;
}

void diagnosticsModeChanged(int modeId) {
    runtimeDiagnostics.modeChangeCount++;
    diagnosticsResetModeStats(modeId);
}

bool diagnosticsMayRefreshDeviceInfo(uint32_t currentMillis) {
    return diagnosticsTextValidUntil == 0 ||
        (int32_t)(currentMillis - diagnosticsTextValidUntil) >= 0;
}

int GetDiagnostics(String command) {
    diagnosticsResetRequested = command.equalsIgnoreCase("RESET");
    if(diagnosticsRequestSequence >= 2147483647)
        diagnosticsRequestSequence = 1;
    else
        diagnosticsRequestSequence++;
    diagnosticsRefreshRequested = true;
    return diagnosticsRequestSequence;
}

#endif

#endif
