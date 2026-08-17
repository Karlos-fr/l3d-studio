#pragma once

#if L3D_DIAGNOSTICS_ENABLED

#define diagnosticsText deviceInfo

void diagnosticsSetupEarly(void);
void diagnosticsSetupComplete(int modeId);
void diagnosticsProcessRequests(void);
void diagnosticsBeginFrame(int modeId);
void diagnosticsEndFrame(void);
void diagnosticsModeChanged(int modeId);
bool diagnosticsMayRefreshDeviceInfo(uint32_t currentMillis);
int GetDiagnostics(bool resetRequested);

#else

inline void diagnosticsSetupEarly(void) {}
inline void diagnosticsSetupComplete(int) {}
inline void diagnosticsProcessRequests(void) {}
inline void diagnosticsBeginFrame(int) {}
inline void diagnosticsEndFrame(void) {}
inline void diagnosticsModeChanged(int) {}
inline bool diagnosticsMayRefreshDeviceInfo(uint32_t) { return true; }

#endif
