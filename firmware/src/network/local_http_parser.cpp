// ============================================================================
// LocalHttpParser - Implementation du parseur HTTP local borne
// ----------------------------------------------------------------------------
// Ce module valide progressivement une requete sans allocation ni recherche
// au-dela des longueurs recues. Il ne declenche aucune commande du cube.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Termine le parseur avec un code d'erreur stable.
//
// Parametres :
// - parser : etat de requete a invalider.
// - errorCode : code LOCAL_API_ERROR a conserver.
//
// Retour :
// - resultat d'erreur transmis au serveur.
//
// Effet de bord :
// - rend le parseur definitivement inutilisable jusqu'a son reset.
// ----------------------------------------------------------------------------
static LocalHttpParseResult localHttpParserFail(
        LocalHttpRequestParser* parser,
        int errorCode) {
    parser->state = LOCAL_HTTP_PARSER_ERROR;
    parser->errorCode = static_cast<int16_t>(errorCode);
    return LOCAL_HTTP_PARSE_ERROR;
}

// ----------------------------------------------------------------------------
// Convertit une lettre ASCII en majuscule pour les comparaisons HTTP.
//
// Parametres :
// - value : caractere a normaliser.
//
// Retour :
// - lettre majuscule correspondante ou valeur originale.
// ----------------------------------------------------------------------------
static char localHttpAsciiUpper(char value) {
    if(value >= 'a' && value <= 'z')
        return static_cast<char>(value - 'a' + 'A');
    return value;
}

// ----------------------------------------------------------------------------
// Compare une tranche HTTP avec une chaine sans distinguer la casse ASCII.
//
// Parametres :
// - text : debut de la tranche recue.
// - length : nombre exact de caracteres a lire.
// - expected : chaine C attendue.
//
// Retour :
// - vrai lorsque les contenus sont identiques hors casse.
// ----------------------------------------------------------------------------
static bool localHttpTextEqualsIgnoreCase(
        const char* text,
        size_t length,
        const char* expected) {
    if(text == NULL || expected == NULL)
        return false;
    size_t expectedLength = strlen(expected);
    if(length != expectedLength)
        return false;
    for(size_t index = 0; index < length; index++) {
        if(localHttpAsciiUpper(text[index]) != localHttpAsciiUpper(expected[index]))
            return false;
    }
    return true;
}

// ----------------------------------------------------------------------------
// Retire les espaces HTTP facultatifs autour d'une tranche.
//
// Parametres :
// - text : debut de la ligne complete.
// - beginIndex : index inclusif a avancer.
// - endIndex : index exclusif a reculer.
//
// Effet de bord :
// - modifie uniquement les deux index fournis.
// ----------------------------------------------------------------------------
static void localHttpTrimOptionalWhitespace(
        const char* text,
        size_t* beginIndex,
        size_t* endIndex) {
    while(*beginIndex < *endIndex &&
          (text[*beginIndex] == ' ' || text[*beginIndex] == '\t'))
        (*beginIndex)++;
    while(*endIndex > *beginIndex &&
          (text[*endIndex - 1] == ' ' || text[*endIndex - 1] == '\t'))
        (*endIndex)--;
}

// ----------------------------------------------------------------------------
// Recherche un caractere dans une ligne bornee.
//
// Parametres :
// - text : debut de la ligne.
// - length : nombre exact de caracteres disponibles.
// - expected : caractere recherche.
// - beginIndex : premier index inspecte.
//
// Retour :
// - index trouve ou moins un lorsque le caractere est absent.
// ----------------------------------------------------------------------------
static int localHttpFindCharacter(
        const char* text,
        size_t length,
        char expected,
        size_t beginIndex) {
    for(size_t index = beginIndex; index < length; index++) {
        if(text[index] == expected)
            return static_cast<int>(index);
    }
    return -1;
}

// ----------------------------------------------------------------------------
// Convertit un Content-Length decimal en appliquant la limite du corps.
//
// Parametres :
// - text : debut de la valeur deja depouillee.
// - length : nombre exact de chiffres.
// - bodyLength : destination de la longueur validee.
//
// Retour :
// - zero en cas de succes ou code LOCAL_API_ERROR correspondant.
//
// Effet de bord :
// - ecrit bodyLength uniquement lorsque tous les caracteres sont valides.
// ----------------------------------------------------------------------------
static int localHttpParseContentLength(
        const char* text,
        size_t length,
        uint16_t* bodyLength) {
    if(length == 0)
        return LOCAL_API_ERROR_BAD_REQUEST;
    uint32_t value = 0;
    for(size_t index = 0; index < length; index++) {
        if(text[index] < '0' || text[index] > '9')
            return LOCAL_API_ERROR_BAD_REQUEST;
        uint32_t digit = static_cast<uint32_t>(text[index] - '0');
        if(value > (LOCAL_API_BODY_LENGTH - digit) / 10UL)
            return LOCAL_API_ERROR_TOO_LARGE;
        value = value * 10UL + digit;
    }
    *bodyLength = static_cast<uint16_t>(value);
    return 0;
}

// ----------------------------------------------------------------------------
// Valide le media type texte accepte par les commandes LAN.
//
// Parametres :
// - text : debut de la valeur Content-Type depouillee.
// - length : nombre exact de caracteres.
//
// Retour :
// - vrai pour text/plain avec charset UTF-8 facultatif.
// ----------------------------------------------------------------------------
static bool localHttpIsTextContentType(const char* text, size_t length) {
    const size_t mediaTypeLength = 10;
    if(length < mediaTypeLength ||
       !localHttpTextEqualsIgnoreCase(text, mediaTypeLength, "text/plain"))
        return false;

    size_t beginIndex = mediaTypeLength;
    size_t endIndex = length;
    localHttpTrimOptionalWhitespace(text, &beginIndex, &endIndex);
    if(beginIndex == endIndex)
        return true;
    if(text[beginIndex] != ';')
        return false;
    beginIndex++;
    localHttpTrimOptionalWhitespace(text, &beginIndex, &endIndex);
    return localHttpTextEqualsIgnoreCase(
        text + beginIndex,
        endIndex - beginIndex,
        "charset=utf-8");
}

// ----------------------------------------------------------------------------
// Decode et valide la premiere ligne HTTP.
//
// Parametres :
// - parser : etat recevant la methode et le chemin.
//
// Retour :
// - zero en cas de succes ou code LOCAL_API_ERROR correspondant.
// ----------------------------------------------------------------------------
static int localHttpParseRequestLine(LocalHttpRequestParser* parser) {
    const char* line = parser->line;
    size_t length = parser->lineLength;
    int firstSpace = localHttpFindCharacter(line, length, ' ', 0);
    if(firstSpace <= 0)
        return LOCAL_API_ERROR_BAD_REQUEST;
    int secondSpace = localHttpFindCharacter(
        line,
        length,
        ' ',
        static_cast<size_t>(firstSpace + 1));
    if(secondSpace <= firstSpace + 1 ||
       localHttpFindCharacter(line, length, ' ', secondSpace + 1) != -1)
        return LOCAL_API_ERROR_BAD_REQUEST;

    if(localHttpTextEqualsIgnoreCase(line, firstSpace, "GET"))
        parser->method = LOCAL_HTTP_METHOD_GET;
    else if(localHttpTextEqualsIgnoreCase(line, firstSpace, "POST"))
        parser->method = LOCAL_HTTP_METHOD_POST;
    else if(localHttpTextEqualsIgnoreCase(line, firstSpace, "OPTIONS"))
        parser->method = LOCAL_HTTP_METHOD_OPTIONS;
    else
        return LOCAL_API_ERROR_METHOD;

    size_t pathLength = static_cast<size_t>(secondSpace - firstSpace - 1);
    if(pathLength == 0 || pathLength >= LOCAL_API_PATH_LENGTH)
        return LOCAL_API_ERROR_TOO_LARGE;
    const char* path = line + firstSpace + 1;
    if(path[0] != '/' ||
       localHttpFindCharacter(path, pathLength, '?', 0) != -1 ||
       localHttpFindCharacter(path, pathLength, '#', 0) != -1)
        return LOCAL_API_ERROR_BAD_REQUEST;
    memcpy(parser->path, path, pathLength);
    parser->path[pathLength] = '\0';

    const char* version = line + secondSpace + 1;
    size_t versionLength = length - static_cast<size_t>(secondSpace + 1);
    if(!localHttpTextEqualsIgnoreCase(version, versionLength, "HTTP/1.0") &&
       !localHttpTextEqualsIgnoreCase(version, versionLength, "HTTP/1.1"))
        return LOCAL_API_ERROR_BAD_REQUEST;
    return 0;
}

// ----------------------------------------------------------------------------
// Decode un en-tete utile ou ignore de facon bornee un en-tete inconnu.
//
// Parametres :
// - parser : etat de requete a completer.
//
// Retour :
// - zero en cas de succes ou code LOCAL_API_ERROR correspondant.
// ----------------------------------------------------------------------------
static int localHttpParseHeader(LocalHttpRequestParser* parser) {
    int colonIndex = localHttpFindCharacter(
        parser->line,
        parser->lineLength,
        ':',
        0);
    if(colonIndex <= 0)
        return LOCAL_API_ERROR_BAD_REQUEST;

    size_t valueBegin = static_cast<size_t>(colonIndex + 1);
    size_t valueEnd = parser->lineLength;
    localHttpTrimOptionalWhitespace(parser->line, &valueBegin, &valueEnd);
    const char* value = parser->line + valueBegin;
    size_t valueLength = valueEnd - valueBegin;

    if(localHttpTextEqualsIgnoreCase(
            parser->line,
            static_cast<size_t>(colonIndex),
            "Content-Length")) {
        if(parser->contentLengthPresent)
            return LOCAL_API_ERROR_BAD_REQUEST;
        int result = localHttpParseContentLength(
            value,
            valueLength,
            &parser->bodyLength);
        if(result != 0)
            return result;
        parser->contentLengthPresent = true;
    }
    else if(localHttpTextEqualsIgnoreCase(
            parser->line,
            static_cast<size_t>(colonIndex),
            "Content-Type")) {
        if(parser->contentTypePresent)
            return LOCAL_API_ERROR_BAD_REQUEST;
        parser->contentTypePresent = true;
        parser->contentTypeText = localHttpIsTextContentType(value, valueLength);
    }
    else if(localHttpTextEqualsIgnoreCase(
            parser->line,
            static_cast<size_t>(colonIndex),
            "Transfer-Encoding")) {
        return LOCAL_API_ERROR_BAD_REQUEST;
    }
    else if(localHttpTextEqualsIgnoreCase(
            parser->line,
            static_cast<size_t>(colonIndex),
            "Access-Control-Request-Private-Network")) {
        parser->privateNetworkRequested = localHttpTextEqualsIgnoreCase(
            value,
            valueLength,
            "true");
    }
    return 0;
}

// ----------------------------------------------------------------------------
// Valide les en-tetes termines et choisit le corps ou l'etat pret.
//
// Parametres :
// - parser : requete dont la ligne vide vient d'etre recue.
//
// Retour :
// - progression, requete complete ou erreur definitive.
// ----------------------------------------------------------------------------
static LocalHttpParseResult localHttpFinishHeaders(
        LocalHttpRequestParser* parser) {
    if(parser->method == LOCAL_HTTP_METHOD_POST) {
        if(!parser->contentLengthPresent)
            return localHttpParserFail(parser, LOCAL_API_ERROR_BAD_REQUEST);
        if(parser->bodyLength > 0 &&
           (!parser->contentTypePresent || !parser->contentTypeText))
            return localHttpParserFail(parser, LOCAL_API_ERROR_MEDIA_TYPE);
    }
    else if(parser->contentLengthPresent && parser->bodyLength > 0) {
        return localHttpParserFail(parser, LOCAL_API_ERROR_BAD_REQUEST);
    }

    if(parser->bodyLength == 0) {
        parser->body[0] = '\0';
        parser->state = LOCAL_HTTP_PARSER_READY;
        return LOCAL_HTTP_PARSE_READY;
    }
    parser->state = LOCAL_HTTP_PARSER_BODY;
    return LOCAL_HTTP_PARSE_PROGRESS;
}

// ----------------------------------------------------------------------------
// Traite une ligne complete selon l'etape courante.
//
// Parametres :
// - parser : etat contenant la ligne terminee.
//
// Retour :
// - progression, requete complete ou erreur definitive.
// ----------------------------------------------------------------------------
static LocalHttpParseResult localHttpProcessLine(
        LocalHttpRequestParser* parser) {
    parser->line[parser->lineLength] = '\0';
    if(parser->state == LOCAL_HTTP_PARSER_REQUEST_LINE) {
        int result = localHttpParseRequestLine(parser);
        if(result != 0)
            return localHttpParserFail(parser, result);
        parser->state = LOCAL_HTTP_PARSER_HEADERS;
    }
    else if(parser->state == LOCAL_HTTP_PARSER_HEADERS) {
        if(parser->lineLength == 0)
            return localHttpFinishHeaders(parser);
        parser->headerCount++;
        if(parser->headerCount > LOCAL_API_HEADER_COUNT_MAX)
            return localHttpParserFail(parser, LOCAL_API_ERROR_TOO_LARGE);
        int result = localHttpParseHeader(parser);
        if(result != 0)
            return localHttpParserFail(parser, result);
    }
    parser->lineLength = 0;
    return LOCAL_HTTP_PARSE_PROGRESS;
}

void localHttpParserReset(LocalHttpRequestParser* parser) {
    if(parser == NULL)
        return;
    memset(parser, 0, sizeof(*parser));
    parser->method = LOCAL_HTTP_METHOD_NONE;
    parser->state = LOCAL_HTTP_PARSER_REQUEST_LINE;
    parser->path[0] = '\0';
    parser->line[0] = '\0';
    parser->body[0] = '\0';
}

LocalHttpParseResult localHttpParserConsume(
        LocalHttpRequestParser* parser,
        uint8_t value) {
    if(parser == NULL)
        return LOCAL_HTTP_PARSE_ERROR;
    if(parser->state == LOCAL_HTTP_PARSER_READY)
        return LOCAL_HTTP_PARSE_READY;
    if(parser->state == LOCAL_HTTP_PARSER_ERROR)
        return LOCAL_HTTP_PARSE_ERROR;

    if(parser->state == LOCAL_HTTP_PARSER_BODY) {
        if(parser->bodyReceived >= parser->bodyLength)
            return localHttpParserFail(parser, LOCAL_API_ERROR_BAD_REQUEST);
        parser->body[parser->bodyReceived++] = static_cast<char>(value);
        if(parser->bodyReceived == parser->bodyLength) {
            parser->body[parser->bodyReceived] = '\0';
            parser->state = LOCAL_HTTP_PARSER_READY;
            return LOCAL_HTTP_PARSE_READY;
        }
        return LOCAL_HTTP_PARSE_PROGRESS;
    }

    if(parser->state == LOCAL_HTTP_PARSER_HEADERS) {
        parser->headerBytes++;
        if(parser->headerBytes > LOCAL_API_HEADER_BYTES_MAX)
            return localHttpParserFail(parser, LOCAL_API_ERROR_TOO_LARGE);
    }

    if(parser->waitingForLineFeed) {
        parser->waitingForLineFeed = false;
        if(value != '\n')
            return localHttpParserFail(parser, LOCAL_API_ERROR_BAD_REQUEST);
        return localHttpProcessLine(parser);
    }
    if(value == '\r') {
        parser->waitingForLineFeed = true;
        return LOCAL_HTTP_PARSE_PROGRESS;
    }
    if(value == '\n')
        return localHttpParserFail(parser, LOCAL_API_ERROR_BAD_REQUEST);

    size_t lineCapacity = parser->state == LOCAL_HTTP_PARSER_REQUEST_LINE
        ? LOCAL_API_REQUEST_LINE_LENGTH
        : LOCAL_API_HEADER_LINE_LENGTH;
    if(static_cast<size_t>(parser->lineLength) + 1 >= lineCapacity)
        return localHttpParserFail(parser, LOCAL_API_ERROR_TOO_LARGE);
    parser->line[parser->lineLength++] = static_cast<char>(value);
    return LOCAL_HTTP_PARSE_PROGRESS;
}

#endif
