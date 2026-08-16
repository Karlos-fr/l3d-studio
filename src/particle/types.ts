// ============================================================================
// ParticleTypes - Implementation des types Particle Cloud
// ----------------------------------------------------------------------------
// Ce fichier decrit les contrats de donnees Particle utilises par l'application.
// Il ne lance aucun appel reseau et ne depend pas de l'interface utilisateur.
// ============================================================================

export interface ParticleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface ParticleApiErrorResponse {
  error?: string;
  error_description?: string;
  info?: string;
}

export interface ParticleDeviceSummary {
  id: string;
  name: string;
  connected: boolean;
  online?: boolean;
  platform_id?: number;
  product_id?: number;
}

export interface ParticleFunctionResponse {
  id?: string;
  name?: string;
  connected?: boolean;
  return_value?: number;
}

export interface ParticleVariableResponse<TValue> {
  cmd?: string;
  name?: string;
  result: TValue;
  coreInfo?: {
    connected?: boolean;
    deviceID?: string;
  };
}

export interface ParticleClientConfig {
  baseUrl?: string;
  token?: string;
  fetchFn?: typeof fetch;
}

export interface ParticleStoredSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number | null;
  refreshToken: string | null;
  deviceId: string | null;
}
