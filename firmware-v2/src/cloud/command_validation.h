// ============================================================================
// CommandValidation - Implementation des validations Cloud sans allocation
// ----------------------------------------------------------------------------
// Ce module valide les caracteres et entiers recus par les commandes firmware.
// Il ne modifie ni l'etat des modes, ni le framebuffer, ni l'EEPROM.
// ============================================================================

#pragma once

#include <stddef.h>

// ----------------------------------------------------------------------------
// Indique si un caractere est un chiffre ASCII decimal.
//
// Parametres :
// - value : caractere a verifier.
//
// Retour :
// - vrai pour une valeur comprise entre `0` et `9`.
// ----------------------------------------------------------------------------
inline bool isAsciiDigit(char value) {
    return value >= '0' && value <= '9';
}

// ----------------------------------------------------------------------------
// Indique si un caractere appartient a la notation hexadecimale ASCII.
//
// Parametres :
// - value : caractere a verifier.
//
// Retour :
// - vrai pour un chiffre decimal ou une lettre comprise entre A et F.
// ----------------------------------------------------------------------------
inline bool isAsciiHexDigit(char value) {
    return isAsciiDigit(value) ||
        (value >= 'a' && value <= 'f') ||
        (value >= 'A' && value <= 'F');
}

// ----------------------------------------------------------------------------
// Verifie qu'une zone de texte contient uniquement des chiffres hexadecimaux.
//
// Parametres :
// - text : debut de la zone a verifier.
// - length : nombre exact de caracteres a lire.
//
// Retour :
// - vrai si la zone est non vide et entierement hexadecimale.
// ----------------------------------------------------------------------------
inline bool isHexText(const char* text, size_t length) {
    if(text == NULL || length == 0)
        return false;
    for(size_t index = 0; index < length; index++) {
        if(!isAsciiHexDigit(text[index]))
            return false;
    }
    return true;
}

// ----------------------------------------------------------------------------
// Convertit un entier decimal non signe apres verification de ses bornes.
//
// Parametres :
// - text : debut de la zone decimale.
// - length : nombre exact de caracteres a lire.
// - minimum : plus petite valeur acceptee.
// - maximum : plus grande valeur acceptee.
// - result : destination de la valeur validee.
//
// Retour :
// - vrai si toute la zone represente une valeur dans les bornes.
//
// Effet de bord :
// - ecrit `result` uniquement lorsque la validation reussit.
// ----------------------------------------------------------------------------
inline bool parseUnsignedText(
        const char* text,
        size_t length,
        int minimum,
        int maximum,
        int* result) {
    if(text == NULL || result == NULL || length == 0)
        return false;

    int value = 0;
    for(size_t index = 0; index < length; index++) {
        if(!isAsciiDigit(text[index]))
            return false;
        int digit = text[index] - '0';
        if(value > (maximum - digit) / 10)
            return false;
        value = value * 10 + digit;
    }

    if(value < minimum || value > maximum)
        return false;
    *result = value;
    return true;
}

// ----------------------------------------------------------------------------
// Convertit un entier decimal signe apres verification de ses bornes.
//
// Parametres :
// - text : debut de la zone decimale, avec un signe moins facultatif.
// - length : nombre exact de caracteres a lire.
// - minimum : plus petite valeur acceptee.
// - maximum : plus grande valeur acceptee.
// - result : destination de la valeur validee.
//
// Retour :
// - vrai si toute la zone represente une valeur dans les bornes.
//
// Effet de bord :
// - ecrit `result` uniquement lorsque la validation reussit.
// ----------------------------------------------------------------------------
inline bool parseSignedText(
        const char* text,
        size_t length,
        int minimum,
        int maximum,
        int* result) {
    if(text == NULL || result == NULL || length == 0)
        return false;

    bool negative = text[0] == '-';
    size_t digitsOffset = negative ? 1 : 0;
    if(digitsOffset == length)
        return false;

    int absoluteMaximum = maximum;
    if(-minimum > absoluteMaximum)
        absoluteMaximum = -minimum;
    int absoluteValue = 0;
    if(!parseUnsignedText(
            text + digitsOffset,
            length - digitsOffset,
            0,
            absoluteMaximum,
            &absoluteValue))
        return false;

    int value = negative ? -absoluteValue : absoluteValue;
    if(value < minimum || value > maximum)
        return false;
    *result = value;
    return true;
}
