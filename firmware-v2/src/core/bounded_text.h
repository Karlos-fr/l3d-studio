// ============================================================================
// BoundedText - Implementation des ecritures de texte bornees
// ----------------------------------------------------------------------------
// Ce module centralise les copies, formats et concatenations dans des buffers
// fixes. Il n'alloue pas de memoire et ne connait ni Particle Cloud ni le rendu.
// ============================================================================

#pragma once

#include <stdarg.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>

// ----------------------------------------------------------------------------
// Vide un buffer texte fixe et garantit sa terminaison nulle.
//
// Parametres :
// - destination : buffer a vider.
// - capacity : taille totale du buffer.
//
// Retour :
// - vrai si le buffer peut recevoir une chaine terminee.
//
// Effet de bord :
// - remplace le premier octet du buffer par un caractere nul.
// ----------------------------------------------------------------------------
inline bool boundedTextClear(char* destination, size_t capacity) {
    if(destination == NULL || capacity == 0)
        return false;
    destination[0] = '\0';
    return true;
}

// ----------------------------------------------------------------------------
// Copie une chaine dans un buffer fixe en conservant sa terminaison nulle.
//
// Parametres :
// - destination : buffer recevant la copie.
// - capacity : taille totale du buffer de destination.
// - source : chaine terminee a copier.
//
// Retour :
// - vrai si la source tient entierement, faux en cas de troncature ou d'entree
//   invalide.
//
// Effet de bord :
// - remplace le contenu du buffer de destination.
// ----------------------------------------------------------------------------
inline bool boundedTextCopy(char* destination, size_t capacity, const char* source) {
    if(destination == NULL || source == NULL || capacity == 0)
        return false;

    size_t sourceLength = strlen(source);
    size_t copyLength = sourceLength < capacity - 1 ? sourceLength : capacity - 1;
    if(copyLength > 0)
        memcpy(destination, source, copyLength);
    destination[copyLength] = '\0';
    return sourceLength < capacity;
}

// ----------------------------------------------------------------------------
// Copie une tranche non terminee dans un buffer fixe.
//
// Parametres :
// - destination : buffer recevant la copie terminee par un caractere nul.
// - capacity : taille totale du buffer de destination.
// - source : debut de la tranche a copier.
// - sourceLength : nombre exact de caracteres a copier.
//
// Retour :
// - vrai si la tranche tient entierement dans le buffer.
//
// Effet de bord :
// - remplace le contenu du buffer et garantit sa terminaison nulle.
// ----------------------------------------------------------------------------
inline bool boundedTextCopyRange(
        char* destination,
        size_t capacity,
        const char* source,
        size_t sourceLength) {
    if(destination == NULL || source == NULL || capacity == 0)
        return false;

    size_t copyLength = sourceLength < capacity - 1
        ? sourceLength
        : capacity - 1;
    if(copyLength > 0)
        memcpy(destination, source, copyLength);
    destination[copyLength] = '\0';
    return sourceLength < capacity;
}

// ----------------------------------------------------------------------------
// Ajoute une chaine a la fin d'un buffer fixe.
//
// Parametres :
// - destination : buffer texte existant et termine.
// - capacity : taille totale du buffer de destination.
// - source : chaine terminee a ajouter.
//
// Retour :
// - vrai si la source tient entierement, faux en cas de troncature ou d'entree
//   invalide.
//
// Effet de bord :
// - complete le buffer sans jamais ecrire au-dela de sa capacite.
// ----------------------------------------------------------------------------
inline bool boundedTextAppend(char* destination, size_t capacity, const char* source) {
    if(destination == NULL || source == NULL || capacity == 0)
        return false;

    size_t destinationLength = strnlen(destination, capacity);
    if(destinationLength >= capacity) {
        destination[capacity - 1] = '\0';
        return false;
    }

    return boundedTextCopy(
        destination + destinationLength,
        capacity - destinationLength,
        source);
}

// ----------------------------------------------------------------------------
// Formate une chaine bornee a partir d'une liste d'arguments deja initialisee.
//
// Parametres :
// - destination : buffer recevant le texte formate.
// - capacity : taille totale du buffer de destination.
// - format : format compatible avec vsnprintf.
// - arguments : liste des arguments du format.
//
// Retour :
// - vrai si le resultat tient entierement dans le buffer.
//
// Effet de bord :
// - remplace le contenu du buffer de destination.
// ----------------------------------------------------------------------------
inline bool boundedTextFormatV(
        char* destination,
        size_t capacity,
        const char* format,
        va_list arguments) {
    if(destination == NULL || format == NULL || capacity == 0)
        return false;

    int written = vsnprintf(destination, capacity, format, arguments);
    destination[capacity - 1] = '\0';
    return written >= 0 && (size_t)written < capacity;
}

// ----------------------------------------------------------------------------
// Formate une chaine dans un buffer fixe.
//
// Parametres :
// - destination : buffer recevant le texte formate.
// - capacity : taille totale du buffer de destination.
// - format : format suivi de ses arguments variables.
//
// Retour :
// - vrai si le resultat tient entierement dans le buffer.
//
// Effet de bord :
// - remplace le contenu du buffer de destination.
// ----------------------------------------------------------------------------
inline bool boundedTextFormat(
        char* destination,
        size_t capacity,
        const char* format,
        ...) {
    va_list arguments;
    va_start(arguments, format);
    bool complete = boundedTextFormatV(destination, capacity, format, arguments);
    va_end(arguments);
    return complete;
}

// ----------------------------------------------------------------------------
// Ajoute un texte formate a la fin d'un buffer fixe.
//
// Parametres :
// - destination : buffer texte existant et termine.
// - capacity : taille totale du buffer de destination.
// - format : format suivi de ses arguments variables.
//
// Retour :
// - vrai si le resultat ajoute tient entierement dans l'espace restant.
//
// Effet de bord :
// - complete le buffer sans jamais ecrire au-dela de sa capacite.
// ----------------------------------------------------------------------------
inline bool boundedTextAppendFormat(
        char* destination,
        size_t capacity,
        const char* format,
        ...) {
    if(destination == NULL || capacity == 0)
        return false;

    size_t destinationLength = strnlen(destination, capacity);
    if(destinationLength >= capacity) {
        destination[capacity - 1] = '\0';
        return false;
    }

    va_list arguments;
    va_start(arguments, format);
    bool complete = boundedTextFormatV(
        destination + destinationLength,
        capacity - destinationLength,
        format,
        arguments);
    va_end(arguments);
    return complete;
}
