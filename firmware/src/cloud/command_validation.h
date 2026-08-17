// ============================================================================
// CommandValidation - Implementation des validations Cloud sans allocation
// ----------------------------------------------------------------------------
// Ce module valide les caracteres et entiers recus par les commandes firmware.
// Il ne modifie ni l'etat des modes, ni le framebuffer, ni l'EEPROM.
// ============================================================================

#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

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
// Compare une tranche non terminee avec une chaine C complete.
//
// Parametres :
// - text : debut de la tranche a comparer.
// - length : longueur exacte de la tranche.
// - expected : chaine C attendue.
//
// Retour :
// - vrai si les longueurs et tous les caracteres sont identiques.
// ----------------------------------------------------------------------------
inline bool textRangeEquals(
        const char* text,
        size_t length,
        const char* expected) {
    if(text == NULL || expected == NULL)
        return false;
    size_t expectedLength = strlen(expected);
    return length == expectedLength && memcmp(text, expected, length) == 0;
}

// ----------------------------------------------------------------------------
// Convertit une tranche hexadecimale en entier non signe.
//
// Parametres :
// - text : debut de la tranche hexadecimale.
// - length : nombre exact de caracteres, limite a huit.
// - result : destination de la valeur convertie.
//
// Retour :
// - vrai si toute la tranche est valide et tient dans 32 bits.
//
// Effet de bord :
// - ecrit `result` uniquement lorsque la conversion reussit.
// ----------------------------------------------------------------------------
inline bool parseHexText(
        const char* text,
        size_t length,
        uint32_t* result) {
    if(text == NULL || result == NULL || length == 0 || length > 8)
        return false;

    uint32_t value = 0;
    for(size_t index = 0; index < length; index++) {
        char character = text[index];
        uint8_t digit;
        if(character >= '0' && character <= '9')
            digit = static_cast<uint8_t>(character - '0');
        else if(character >= 'A' && character <= 'F')
            digit = static_cast<uint8_t>(character - 'A' + 10);
        else if(character >= 'a' && character <= 'f')
            digit = static_cast<uint8_t>(character - 'a' + 10);
        else
            return false;
        value = (value << 4) | digit;
    }
    *result = value;
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
