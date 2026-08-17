// ============================================================================
// AnimationLifecycle - Declaration du cycle de vie des modes
// ----------------------------------------------------------------------------
// Ce module encadre l'entree, le rendu et la sortie d'un mode. Il garantit que
// la zone d'etat mutualisee n'est utilisee que par son proprietaire courant.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Initialise le proprietaire logique et l'etat du mode charge au demarrage.
//
// Parametres :
// - modeId : identifiant historique du mode charge depuis l'EEPROM.
//
// Effet de bord :
// - initialise completement l'etat du mode et sa zone mutualisee.
// ----------------------------------------------------------------------------
void animationLifecycleStart(int modeId);

// ----------------------------------------------------------------------------
// Quitte le mode actif et ferme ses ressources reseau eventuelles.
//
// Parametres :
// - modeId : identifiant du mode a quitter.
//
// Effet de bord :
// - ferme les sockets et invalide le proprietaire de la zone mutualisee.
// ----------------------------------------------------------------------------
void animationExit(int modeId);

// ----------------------------------------------------------------------------
// Entre dans un mode et initialise entierement son etat.
//
// Parametres :
// - modeId : identifiant du mode a initialiser.
//
// Effet de bord :
// - attribue la zone mutualisee puis appelle la reinitialisation historique.
// ----------------------------------------------------------------------------
void animationEnter(int modeId);

// ----------------------------------------------------------------------------
// Execute une frame du mode actuellement proprietaire de son etat.
//
// Effet de bord :
// - repare une incoherence de proprietaire avant d'appeler le rendu courant.
// ----------------------------------------------------------------------------
void animationTick(void);
