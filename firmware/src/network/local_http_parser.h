// ============================================================================
// LocalHttpParser - Declaration du parseur HTTP local borne
// ----------------------------------------------------------------------------
// Ce module decrit uniquement la requete HTTP recue. Il ne connait ni les
// sockets Particle, ni les commandes du cube, ni le format des reponses.
// ============================================================================

#pragma once

#include <stddef.h>
#include <stdint.h>

// Methodes HTTP reconnues par la premiere API LAN.
enum LocalHttpMethod : uint8_t {
    LOCAL_HTTP_METHOD_NONE = 0,
    LOCAL_HTTP_METHOD_GET,
    LOCAL_HTTP_METHOD_POST,
    LOCAL_HTTP_METHOD_OPTIONS
};

// Etapes successives de reception d'une requete HTTP.
enum LocalHttpParserState : uint8_t {
    LOCAL_HTTP_PARSER_REQUEST_LINE = 0,
    LOCAL_HTTP_PARSER_HEADERS,
    LOCAL_HTTP_PARSER_BODY,
    LOCAL_HTTP_PARSER_READY,
    LOCAL_HTTP_PARSER_ERROR
};

// Resultat produit apres la consommation d'un octet.
enum LocalHttpParseResult : uint8_t {
    LOCAL_HTTP_PARSE_PROGRESS = 0,
    LOCAL_HTTP_PARSE_READY,
    LOCAL_HTTP_PARSE_ERROR
};

// Etat fixe d'une requete et de sa validation progressive.
struct LocalHttpRequestParser {
    LocalHttpMethod method;
    LocalHttpParserState state;
    char path[LOCAL_API_PATH_LENGTH];
    char line[LOCAL_API_HEADER_LINE_LENGTH];
    char body[LOCAL_API_BODY_LENGTH + 1];
    uint16_t lineLength;
    uint16_t bodyLength;
    uint16_t bodyReceived;
    uint16_t headerBytes;
    uint8_t headerCount;
    int16_t errorCode;
    bool contentLengthPresent;
    bool contentTypePresent;
    bool contentTypeText;
    bool contentTypeBinary;
    bool privateNetworkRequested;
    bool waitingForLineFeed;
};

// ----------------------------------------------------------------------------
// Reinitialise integralement un parseur avant une nouvelle connexion.
//
// Parametres :
// - parser : etat fixe a remettre au debut de la ligne de requete.
//
// Effet de bord :
// - efface les longueurs, drapeaux et terminaisons des buffers internes.
// ----------------------------------------------------------------------------
void localHttpParserReset(LocalHttpRequestParser* parser);

// ----------------------------------------------------------------------------
// Consomme un octet HTTP et avance la validation de la requete.
//
// Parametres :
// - parser : etat fixe de la connexion courante.
// - value : octet nouvellement recu.
//
// Retour :
// - progression, requete complete ou erreur definitive.
//
// Effet de bord :
// - ajoute au plus un octet aux buffers bornes du parseur.
// ----------------------------------------------------------------------------
LocalHttpParseResult localHttpParserConsume(
    LocalHttpRequestParser* parser,
    uint8_t value);
