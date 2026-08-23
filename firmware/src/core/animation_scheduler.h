// ============================================================================
// AnimationScheduler - Declaration de l'ordonnanceur cooperatif
// ----------------------------------------------------------------------------
// Ce module rend la main aux services reseau pendant les attentes et differe
// les changements de mode jusqu'a une frontiere sure entre deux rendus.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Marque le debut d'un cycle de rendu susceptible d'utiliser l'etat partage.
//
// Effet de bord :
// - interdit l'application immediate d'un changement recu pendant Particle.process().
// ----------------------------------------------------------------------------
void animationSchedulerBeginCycle(void);

// ----------------------------------------------------------------------------
// Termine un cycle et applique le changement de mode reseau eventuellement differe.
//
// Effet de bord :
// - peut quitter le mode courant puis initialiser le mode demande.
// ----------------------------------------------------------------------------
void animationSchedulerFinishCycle(void);

// ----------------------------------------------------------------------------
// Indique si l'etat courant ne contient plus de changement de mode differe.
//
// Retour :
// - vrai lorsque le mode et ses reglages forment un instantane coherent.
// ----------------------------------------------------------------------------
bool animationSchedulerMayReadState(void);

// ----------------------------------------------------------------------------
// Enregistre un changement de mode lorsqu'un callback reseau interrompt un rendu.
//
// Parametres :
// - modeIndex : index valide dans modeStruct.
//
// Retour :
// - vrai si la demande est differee, faux si elle peut etre appliquee maintenant.
//
// Effet de bord :
// - positionne stop afin que les boucles historiques rejoignent leur sortie.
// ----------------------------------------------------------------------------
bool animationSchedulerDeferModeChange(int modeIndex);

// ----------------------------------------------------------------------------
// Demande un changement interne a appliquer apres le rendu courant.
//
// Parametres :
// - modeIndex : index valide dans modeStruct.
//
// Effet de bord :
// - differe toujours la demande pendant un cycle afin de proteger le scratch.
// ----------------------------------------------------------------------------
void animationSchedulerRequestModeChange(int modeIndex);

// ----------------------------------------------------------------------------
// Traite les services Particle et LAN dans une fenetre de callback protegee.
//
// Effet de bord :
// - peut executer un callback et enregistrer un changement de mode differe ;
// - sert une portion bornee de la transaction HTTP locale.
// ----------------------------------------------------------------------------
void animationProcessServices(void);

// ----------------------------------------------------------------------------
// Attend une duree historique tout en servant Particle Cloud et le LAN.
//
// Parametres :
// - durationMillis : attente maximale en millisecondes.
//
// Effet de bord :
// - rend regulierement la main a Device OS et abrege l'attente si un mode change.
// ----------------------------------------------------------------------------
void animationCooperativeDelay(uint32_t durationMillis);
