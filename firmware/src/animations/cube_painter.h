// ============================================================================
// CubePainter - Déclaration des écritures voxel persistantes
// ----------------------------------------------------------------------------
// Ce fichier expose la commande a buffer fixe et son adaptateur Particle. Le
// parsing générique des autres commandes reste dans CommandDispatch.
// ============================================================================

#pragma once

#include <stddef.h>

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
// Valide puis applique une commande CubePainter depuis une tranche bornee.
//
// Parametres :
// - commandText : debut de la commande, sans terminaison obligatoire.
// - commandLength : nombre exact de caracteres disponibles.
//
// Retour :
// - zero en cas de succes ou un code COMMAND_ERROR negatif.
//
// Effet de bord :
// - modifie les voxels et l'EEPROM uniquement apres validation complete.
// ----------------------------------------------------------------------------
int cubePainterFromBuffer(const char* commandText, size_t commandLength);

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
