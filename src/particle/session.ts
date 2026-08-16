// ============================================================================
// ParticleSession - Implementation de la session Particle locale
// ----------------------------------------------------------------------------
// Ce fichier gere la persistance locale du token Particle et du device choisi.
// Il ne lance aucun appel reseau et ne manipule pas le DOM.
// ============================================================================

import type { ParticleStoredSession, ParticleTokenResponse } from "./types";

export interface ParticleSessionStorage {
  // ----------------------------------------------------------------------------
  // Lit une valeur de session depuis le stockage.
  //
  // Parametres :
  // - key : cle de stockage a lire.
  //
  // Retour :
  // - valeur stockee, ou `null` si elle est absente.
  // ----------------------------------------------------------------------------
  getItem(key: string): string | null;

  // ----------------------------------------------------------------------------
  // Ecrit une valeur de session dans le stockage.
  //
  // Parametres :
  // - key : cle de stockage a ecrire.
  // - value : valeur serialisee a stocker.
  //
  // Effet de bord :
  // - modifie le stockage local fourni.
  // ----------------------------------------------------------------------------
  setItem(key: string, value: string): void;

  // ----------------------------------------------------------------------------
  // Supprime une valeur de session du stockage.
  //
  // Parametres :
  // - key : cle de stockage a supprimer.
  //
  // Effet de bord :
  // - modifie le stockage local fourni.
  // ----------------------------------------------------------------------------
  removeItem(key: string): void;
}

// Cle localStorage utilisee pour la session Particle de L3D Studio.
const PARTICLE_SESSION_STORAGE_KEY = "l3d-studio.particle.session";

// ----------------------------------------------------------------------------
// Construit une session persistable a partir d'une reponse de token.
//
// Parametres :
// - tokenResponse : reponse OAuth Particle recue apres login.
// - now : timestamp courant en millisecondes.
// - deviceId : device Particle selectionne, quand il existe deja.
//
// Retour :
// - session locale sans mot de passe.
// ----------------------------------------------------------------------------
export function createSessionFromToken(
  tokenResponse: ParticleTokenResponse,
  now: number,
  deviceId: string | null = null,
): ParticleStoredSession {
  return {
    accessToken: tokenResponse.access_token,
    tokenType: tokenResponse.token_type,
    expiresAt: now + tokenResponse.expires_in * 1000,
    refreshToken: tokenResponse.refresh_token ?? null,
    deviceId,
  };
}

// ----------------------------------------------------------------------------
// Charge la session Particle depuis le stockage local.
//
// Parametres :
// - storage : stockage compatible localStorage.
//
// Retour :
// - session Particle persistante, ou `null` si absente ou illisible.
// ----------------------------------------------------------------------------
export function loadParticleSession(
  storage: ParticleSessionStorage,
): ParticleStoredSession | null {
  const rawValue = storage.getItem(PARTICLE_SESSION_STORAGE_KEY);

  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ParticleStoredSession;
  } catch {
    storage.removeItem(PARTICLE_SESSION_STORAGE_KEY);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Sauvegarde la session Particle dans le stockage local.
//
// Parametres :
// - storage : stockage compatible localStorage.
// - session : session Particle a sauvegarder.
//
// Effet de bord :
// - ecrit la session serialisee dans le stockage local.
// ----------------------------------------------------------------------------
export function saveParticleSession(
  storage: ParticleSessionStorage,
  session: ParticleStoredSession,
): void {
  storage.setItem(PARTICLE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

// ----------------------------------------------------------------------------
// Supprime la session Particle du stockage local.
//
// Parametres :
// - storage : stockage compatible localStorage.
//
// Effet de bord :
// - retire le token et le device selectionne du stockage local.
// ----------------------------------------------------------------------------
export function clearParticleSession(storage: ParticleSessionStorage): void {
  storage.removeItem(PARTICLE_SESSION_STORAGE_KEY);
}

// ----------------------------------------------------------------------------
// Indique si la session Particle est expiree.
//
// Parametres :
// - session : session Particle a verifier.
// - now : timestamp courant en millisecondes.
//
// Retour :
// - `true` si la session est expiree, sinon `false`.
// ----------------------------------------------------------------------------
export function isParticleSessionExpired(
  session: ParticleStoredSession,
  now: number,
): boolean {
  return session.expiresAt !== null && session.expiresAt <= now;
}
