// ============================================================================
// LocalApiServer - Declaration du premier serveur HTTP local
// ----------------------------------------------------------------------------
// Ce module expose uniquement le cycle de vie du transport LAN. Les routes de
// commandes et les diagnostics complets sont ajoutes dans les phases suivantes.
// ============================================================================

#pragma once

#if L3D_LOCAL_API_ENABLED

// ----------------------------------------------------------------------------
// Initialise l'etat fixe du serveur sans attendre le reseau.
//
// Effet de bord :
// - remet le parseur et la connexion courante dans leur etat ferme.
// ----------------------------------------------------------------------------
void localApiSetup(void);

// ----------------------------------------------------------------------------
// Sert une portion bornee de la connexion HTTP locale.
//
// Effet de bord :
// - peut ouvrir l'ecoute, accepter un client, lire une requete ou ecrire une
//   partie de reponse, sans depasser LOCAL_API_BYTES_PER_TICK.
// ----------------------------------------------------------------------------
void localApiProcess(void);

#else

inline void localApiSetup(void) {}
inline void localApiProcess(void) {}

#endif
