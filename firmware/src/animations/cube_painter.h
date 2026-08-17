// ============================================================================
// CubePainter - Déclaration des écritures voxel persistantes
// ----------------------------------------------------------------------------
// Ce fichier expose uniquement l'endpoint historique CubePainter. Le parsing
// générique des autres commandes reste dans le module Cloud.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Convertit une tranche décimale de la commande sans créer de sous-chaîne.
//
// Parametres :
// - commandText : texte complet de la commande.
// - beginIndex : premier caractère inclus dans la tranche.
// - endIndex : premier caractère exclu de la tranche.
// - value : destination de la valeur convertie.
//
// Retour :
// - vrai lorsque la tranche représente un index de voxel valide.
// ----------------------------------------------------------------------------
bool parsePainterVoxelIndex(
    const char* commandText,
    int beginIndex,
    int endIndex,
    int* value);

// ----------------------------------------------------------------------------
// Valide puis applique une commande de couleur ou d'effacement CubePainter.
//
// Parametres :
// - command : commande historique fournie par Particle Cloud.
//
// Retour :
// - zéro en cas de succès ou un code COMMAND_ERROR négatif.
// ----------------------------------------------------------------------------
int CubePainter(String command);
