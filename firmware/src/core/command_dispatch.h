// ============================================================================
// CommandDispatch - Declaration des commandes metier Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier expose les entrees a buffers fixes partagees par Particle et le
// futur serveur LAN. Il ne declare aucun type propre a un transport.
// ============================================================================

#pragma once

#include <stddef.h>

// ----------------------------------------------------------------------------
// Memorise puis retourne le resultat d'une commande externe.
//
// Parametres :
// - result : code historique ou erreur de validation a conserver.
//
// Retour :
// - valeur result inchangee pour permettre son emploi dans un adaptateur.
//
// Effet de bord :
// - actualise le dernier resultat expose dans l'etat LAN.
// ----------------------------------------------------------------------------
int recordCommandResult(int result);

// ----------------------------------------------------------------------------
// Valide puis applique une commande historique de mode depuis une tranche.
//
// Parametres :
// - commandText : debut de la commande, sans terminaison obligatoire.
// - commandLength : nombre exact d'octets disponibles.
//
// Retour :
// - resultat historique de SetMode ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - modifie le mode, ses reglages et l'EEPROM uniquement apres validation.
// ----------------------------------------------------------------------------
int setModeFromBuffer(const char* commandText, size_t commandLength);

// ----------------------------------------------------------------------------
// Route une commande generique depuis une tranche bornee.
//
// Parametres :
// - commandText : debut de la commande, sans terminaison obligatoire.
// - commandLength : nombre exact d'octets disponibles.
//
// Retour :
// - resultat historique de FnRouter ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - peut modifier l'heure, les switches, les diagnostics ou demander un reset.
// ----------------------------------------------------------------------------
int routeCommandFromBuffer(const char* commandText, size_t commandLength);

// ----------------------------------------------------------------------------
// Met a jour le texte persistant depuis une tranche bornee.
//
// Parametres :
// - text : debut du texte a appliquer.
// - textLength : nombre exact d'octets disponibles.
//
// Retour :
// - un en cas de succes ou COMMAND_ERROR_TOO_LONG si le texte depasse.
//
// Effet de bord :
// - met a jour l'EEPROM lorsque le texte differe de la valeur persistante.
// ----------------------------------------------------------------------------
int setTextFromBuffer(const char* text, size_t textLength);
