// ============================================================================
// LocalApiServer - Implementation du premier serveur HTTP local
// ----------------------------------------------------------------------------
// Ce module gere un seul TCPClient, ferme chaque transaction et expose la
// sante, les diagnostics et les commandes partagees avec Particle. Il ne
// contient aucune logique metier propre au cube.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_LOCAL_API_ENABLED

// Capacite fixe de l'en-tete de reponse produit avant son envoi segmente.
const size_t LOCAL_API_RESPONSE_HEADER_CAPACITY = 384;

// Capacite fixe d'un corps d'erreur compact.
const size_t LOCAL_API_ERROR_BODY_CAPACITY = 32;

// Intervalle entre deux nouvelles tentatives d'ouverture du serveur.
const uint32_t LOCAL_API_BEGIN_RETRY_MS = 1000UL;

// Nombre maximal de tranches durables composant un corps de reponse.
const uint8_t LOCAL_API_RESPONSE_PARTS_MAX = 5;

// Separateur entre les noms et parametres historiques des modes.
static const char LOCAL_API_MODES_PARAMETERS_PREFIX[] = "\nparams=";

// Terminaison commune des reponses segmentees.
static const char LOCAL_API_BODY_SUFFIX[] = "\n";

// En-tete CORS ajoute lorsque le navigateur demande le reseau prive.
static const char LOCAL_API_PRIVATE_NETWORK_HEADER[] =
    "Access-Control-Allow-Private-Network: true\r\n";

// Etat d'envoi progressif d'une reponse HTTP.
enum LocalApiResponseState : uint8_t {
    LOCAL_API_RESPONSE_IDLE = 0,
    LOCAL_API_RESPONSE_HEADER,
    LOCAL_API_RESPONSE_BODY
};

// Vue durable de la reponse en cours, sans allocation dynamique.
struct LocalApiResponse {
    LocalApiResponseState state;
    bool timeoutPrepared;
    char header[LOCAL_API_RESPONSE_HEADER_CAPACITY];
    char errorBody[LOCAL_API_ERROR_BODY_CAPACITY];
    const char* bodyParts[LOCAL_API_RESPONSE_PARTS_MAX];
    uint16_t bodyPartLengths[LOCAL_API_RESPONSE_PARTS_MAX];
    uint16_t headerLength;
    uint16_t headerSent;
    uint16_t bodySent;
    uint8_t bodyPartCount;
    uint8_t bodyPartIndex;
};

// Socket d'ecoute durable sur le port local contractuel.
static TCPServer localApiServer = TCPServer(LOCAL_API_PORT);

// Unique client accepte pendant une transaction.
static TCPClient localApiClient;

// Parseur et corps fixe de l'unique requete courante.
static LocalHttpRequestParser localApiParser;

// Reponse fixe envoyee progressivement au client courant.
static LocalApiResponse localApiResponse = {};

// Indique qu'un client possede actuellement le parseur et les buffers.
static bool localApiClientActive = false;

// Indique que begin a reussi depuis la derniere connexion Wi-Fi.
static bool localApiListening = false;

// Conserve l'etat Wi-Fi du passage precedent pour detecter les transitions.
static bool localApiWiFiWasReady = false;

// Horodatage de la derniere tentative d'ouverture du serveur.
static uint32_t localApiLastBeginAttemptMillis = 0;

// Horodatage de l'acceptation du client courant.
static uint32_t localApiTransactionStartedMillis = 0;

// Horodatage du dernier octet lu ou ecrit avec succes.
static uint32_t localApiLastActivityMillis = 0;

// Horodatage fin de l'acceptation utilise pour la latence firmware.
static uint32_t localApiTransactionStartedMicros = 0;

// Sequence monotone propre aux instantanes produits directement sur le LAN.
static int32_t localApiDiagnosticsSequence = 0;

// Indique qu'une commande metier synchrone utilise le corps de requete.
static bool localApiCommandActive = false;

// ----------------------------------------------------------------------------
// Retourne la raison textuelle stable d'un statut HTTP pris en charge.
//
// Parametres :
// - status : code HTTP entier.
//
// Retour :
// - chaine constante correspondant au statut.
// ----------------------------------------------------------------------------
static const char* localApiStatusText(int status) {
    switch(status) {
        case 200: return "OK";
        case 204: return "No Content";
        case 400: return "Bad Request";
        case 404: return "Not Found";
        case 405: return "Method Not Allowed";
        case 408: return "Request Timeout";
        case 413: return "Content Too Large";
        case 415: return "Unsupported Media Type";
        case 409: return "Conflict";
        case 422: return "Unprocessable Content";
        case 503: return "Service Unavailable";
        default: return "Internal Server Error";
    }
}

// ----------------------------------------------------------------------------
// Associe un code de transport au statut HTTP contractuel.
//
// Parametres :
// - errorCode : code LOCAL_API_ERROR negatif.
//
// Retour :
// - statut HTTP a retourner au client.
// ----------------------------------------------------------------------------
static int localApiStatusFromError(int errorCode) {
    switch(errorCode) {
        case LOCAL_API_ERROR_BAD_REQUEST: return 400;
        case LOCAL_API_ERROR_TOO_LARGE: return 413;
        case LOCAL_API_ERROR_METHOD: return 405;
        case LOCAL_API_ERROR_MEDIA_TYPE: return 415;
        case LOCAL_API_ERROR_NOT_FOUND: return 404;
        case LOCAL_API_ERROR_TIMEOUT: return 408;
        case LOCAL_API_ERROR_BUSY: return 503;
        case LOCAL_API_ERROR_STATE: return 409;
        default: return 500;
    }
}

// ----------------------------------------------------------------------------
// Indique si un chemin appartient au contrat API v1.
//
// Parametres :
// - path : chemin termine par un caractere nul.
//
// Retour :
// - vrai pour une route actuelle ou prevue par le contrat.
// ----------------------------------------------------------------------------
static bool localApiIsKnownPath(const char* path) {
    return strcmp(path, "/api/v1/health") == 0 ||
        strcmp(path, "/api/v1/diagnostics") == 0 ||
        strcmp(path, "/api/v1/diagnostics/reset") == 0 ||
        strcmp(path, "/api/v1/state") == 0 ||
        strcmp(path, "/api/v1/modes") == 0 ||
        strcmp(path, "/api/v1/aux-switches") == 0 ||
        strcmp(path, "/api/v1/command") == 0 ||
        strcmp(path, "/api/v1/mode") == 0 ||
        strcmp(path, "/api/v1/text") == 0 ||
        strcmp(path, "/api/v1/cube-painter") == 0 ||
        strcmp(path, "/api/v1/stream/frame") == 0;
}

// ----------------------------------------------------------------------------
// Ferme le client courant et libere logiquement tous les buffers de requete.
//
// Effet de bord :
// - coupe le socket et remet parseur et reponse a leur etat initial.
// ----------------------------------------------------------------------------
static void localApiCloseClient(void) {
    if(localApiClientActive)
        localApiClient.stop();
    localApiClientActive = false;
    localApiResponse.state = LOCAL_API_RESPONSE_IDLE;
    localApiResponse.timeoutPrepared = false;
    localApiResponse.headerLength = 0;
    localApiResponse.headerSent = 0;
    localApiResponse.bodySent = 0;
    localApiResponse.bodyPartCount = 0;
    localApiResponse.bodyPartIndex = 0;
    localHttpParserReset(&localApiParser);
}

// ----------------------------------------------------------------------------
// Prepare une reponse HTTP composee de tranches durables.
//
// Parametres :
// - status : statut HTTP a encoder.
// - bodyParts : adresses durables des tranches a envoyer.
// - bodyPartLengths : longueurs exactes des tranches.
// - bodyPartCount : nombre de tranches utilisees.
// - privateNetwork : vrai pour autoriser le preflight reseau prive.
//
// Retour :
// - vrai si l'en-tete tient dans sa capacite.
//
// Effet de bord :
// - remplace la reponse en cours et commence son envoi segmente.
// ----------------------------------------------------------------------------
static bool localApiPrepareSegmentedResponse(
        int status,
        const char* const* bodyParts,
        const size_t* bodyPartLengths,
        uint8_t bodyPartCount,
        bool privateNetwork) {
    if(bodyPartCount > LOCAL_API_RESPONSE_PARTS_MAX)
        return false;
    size_t bodyLength = 0;
    for(uint8_t index = 0; index < bodyPartCount; index++) {
        if(bodyPartLengths[index] > 65535UL - bodyLength)
            return false;
        bodyLength += bodyPartLengths[index];
    }
    if(bodyLength > LOCAL_API_RESPONSE_BODY_MAX)
        return false;
    const char* privateHeader = privateNetwork
        ? LOCAL_API_PRIVATE_NETWORK_HEADER
        : "";
    uint32_t serviceMicros = micros() - localApiTransactionStartedMicros;
    int headerLength = snprintf(
        localApiResponse.header,
        sizeof(localApiResponse.header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: text/plain; charset=utf-8\r\n"
        "Content-Length: %u\r\n"
        "Cache-Control: no-store\r\n"
        "Connection: close\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Access-Control-Max-Age: 600\r\n"
        "%s"
        "X-L3D-Service-Us: %lu\r\n"
        "\r\n",
        status,
        localApiStatusText(status),
        static_cast<unsigned int>(bodyLength),
        privateHeader,
        static_cast<unsigned long>(serviceMicros));
    if(headerLength < 0 ||
       static_cast<size_t>(headerLength) >= sizeof(localApiResponse.header))
        return false;

    localApiResponse.state = LOCAL_API_RESPONSE_HEADER;
    localApiResponse.timeoutPrepared = false;
    localApiResponse.headerLength = static_cast<uint16_t>(headerLength);
    localApiResponse.headerSent = 0;
    localApiResponse.bodySent = 0;
    localApiResponse.bodyPartCount = bodyPartCount;
    localApiResponse.bodyPartIndex = 0;
    for(uint8_t index = 0; index < bodyPartCount; index++) {
        localApiResponse.bodyParts[index] = bodyParts[index];
        localApiResponse.bodyPartLengths[index] =
            static_cast<uint16_t>(bodyPartLengths[index]);
    }
    return true;
}

// ----------------------------------------------------------------------------
// Prepare une reponse HTTP avec un corps contigu unique.
//
// Parametres :
// - status : statut HTTP a encoder.
// - body : corps durable a envoyer, ou NULL pour un corps vide.
// - bodyLength : nombre exact d'octets du corps.
// - privateNetwork : vrai pour autoriser le preflight reseau prive.
//
// Retour :
// - vrai si le corps et l'en-tete respectent leurs capacites.
//
// Effet de bord :
// - remplace la reponse en cours et commence son envoi segmente.
// ----------------------------------------------------------------------------
static bool localApiPrepareResponse(
        int status,
        const char* body,
        size_t bodyLength,
        bool privateNetwork) {
    const char* bodyParts[1] = {body};
    size_t bodyPartLengths[1] = {bodyLength};
    return localApiPrepareSegmentedResponse(
        status,
        bodyParts,
        bodyPartLengths,
        1,
        privateNetwork);
}

// ----------------------------------------------------------------------------
// Prepare une erreur de transport avec son code compact.
//
// Parametres :
// - errorCode : code LOCAL_API_ERROR negatif.
//
// Effet de bord :
// - formate le corps fixe puis initialise la reponse HTTP correspondante.
// ----------------------------------------------------------------------------
static void localApiPrepareError(int errorCode) {
    int bodyLength = snprintf(
        localApiResponse.errorBody,
        sizeof(localApiResponse.errorBody),
        "v=1\nerror=%d\n",
        errorCode);
    bool prepared = bodyLength >= 0 &&
       static_cast<size_t>(bodyLength) < sizeof(localApiResponse.errorBody) &&
       localApiPrepareResponse(
            localApiStatusFromError(errorCode),
            localApiResponse.errorBody,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested);
    if(!prepared) {
        localApiCloseClient();
        return;
    }
    localApiResponse.timeoutPrepared = errorCode == LOCAL_API_ERROR_TIMEOUT;
}

// ----------------------------------------------------------------------------
// Incremente et retourne la sequence locale des diagnostics.
//
// Retour :
// - entier positif monotone, rebouclant a un apres la borne signee.
//
// Effet de bord :
// - modifie la sequence conservee par le serveur LAN.
// ----------------------------------------------------------------------------
static int32_t localApiNextDiagnosticsSequence(void) {
    if(localApiDiagnosticsSequence >= 2147483647L)
        localApiDiagnosticsSequence = 1;
    else
        localApiDiagnosticsSequence++;
    return localApiDiagnosticsSequence;
}

// ----------------------------------------------------------------------------
// Prepare la sante locale complete dans le scratch de requete libere.
//
// Effet de bord :
// - remplace le corps recu par la reponse, valable jusqu'a la fermeture.
// ----------------------------------------------------------------------------
static void localApiRouteHealth(void) {
    int bodyLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=1\nfw=%s\nos=%s\nu=%lu\ni=%d\nk=%d\n",
        BUILD_REVISION,
        BUILD_DEVICE_OS_VERSION,
        millis() / 1000UL,
        WiFi.ready() ? 1 : 0,
        Particle.connected() ? 1 : 0);
    if(bodyLength < 0 ||
       static_cast<size_t>(bodyLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareResponse(
            200,
            localApiParser.body,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
}

// ----------------------------------------------------------------------------
// Prepare un instantane au point de cooperation reseau courant.
//
// Parametres :
// - resetRequested : vrai pour remettre les statistiques a zero avant lecture.
//
// Retour :
// - vrai apres preparation de la reponse.
//
// Effet de bord :
// - reutilise le corps de requete et peut reinitialiser les statistiques.
// ----------------------------------------------------------------------------
static bool localApiRouteDiagnostics(bool resetRequested) {
    int bodyLength = diagnosticsWriteSnapshot(
        localApiParser.body,
        sizeof(localApiParser.body),
        resetRequested,
        localApiNextDiagnosticsSequence());
    if(bodyLength < 0 ||
       !localApiPrepareResponse(
            200,
            localApiParser.body,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
    return true;
}

// ----------------------------------------------------------------------------
// Prepare un instantane coherent de l'etat courant du cube.
//
// Retour :
// - vrai apres preparation, faux si un changement de mode reste differe.
//
// Effet de bord :
// - remplace le corps de requete par l'etat versionne a envoyer.
// ----------------------------------------------------------------------------
static bool localApiRouteState(void) {
    if(!animationSchedulerMayReadState())
        return false;
    int bodyLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=%d\nm=%d\nname=%s\nb=%d\ns=%d\ncolors=%06lX;%06lX;%06lX;%06lX;%06lX;%06lX\nswitches=%d;%d;%d;%d\ni=%d\nk=%d\nr=%d\n",
        LOCAL_API_STATE_VERSION,
        currentModeID,
        currentModeName,
        brightness,
        speedIndex,
        static_cast<unsigned long>(color1 & 0xFFFFFFUL),
        static_cast<unsigned long>(color2 & 0xFFFFFFUL),
        static_cast<unsigned long>(color3 & 0xFFFFFFUL),
        static_cast<unsigned long>(color4 & 0xFFFFFFUL),
        static_cast<unsigned long>(color5 & 0xFFFFFFUL),
        static_cast<unsigned long>(color6 & 0xFFFFFFUL),
        switch1 ? 1 : 0,
        switch2 ? 1 : 0,
        switch3 ? 1 : 0,
        switch4 ? 1 : 0,
        WiFi.ready() ? 1 : 0,
        Particle.connected() ? 1 : 0,
        lastCommandResult);
    if(bodyLength < 0 ||
       static_cast<size_t>(bodyLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareResponse(
            200,
            localApiParser.body,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
    return true;
}

// ----------------------------------------------------------------------------
// Prepare le catalogue des modes depuis ses deux buffers historiques.
//
// Effet de bord :
// - envoie cinq tranches durables sans recopier les deux catalogues.
// ----------------------------------------------------------------------------
static void localApiRouteModes(void) {
    int prefixLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=%d\nnames=",
        LOCAL_API_STATE_VERSION);
    const char* bodyParts[5] = {
        localApiParser.body,
        modeNameList,
        LOCAL_API_MODES_PARAMETERS_PREFIX,
        modeParamList,
        LOCAL_API_BODY_SUFFIX
    };
    size_t bodyPartLengths[5] = {
        static_cast<size_t>(prefixLength < 0 ? 0 : prefixLength),
        strlen(modeNameList),
        sizeof(LOCAL_API_MODES_PARAMETERS_PREFIX) - 1,
        strlen(modeParamList),
        sizeof(LOCAL_API_BODY_SUFFIX) - 1
    };
    if(prefixLength < 0 ||
       static_cast<size_t>(prefixLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareSegmentedResponse(
            200,
            bodyParts,
            bodyPartLengths,
            5,
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_TOO_LARGE);
}

// ----------------------------------------------------------------------------
// Prepare les switches auxiliaires depuis leur buffer historique.
//
// Effet de bord :
// - envoie trois tranches durables sans recopier la liste publiee.
// ----------------------------------------------------------------------------
static void localApiRouteAuxSwitches(void) {
    int prefixLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=%d\nswitches=",
        LOCAL_API_STATE_VERSION);
    const char* bodyParts[3] = {
        localApiParser.body,
        auxSwitchList,
        LOCAL_API_BODY_SUFFIX
    };
    size_t bodyPartLengths[3] = {
        static_cast<size_t>(prefixLength < 0 ? 0 : prefixLength),
        strlen(auxSwitchList),
        sizeof(LOCAL_API_BODY_SUFFIX) - 1
    };
    if(prefixLength < 0 ||
       static_cast<size_t>(prefixLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareSegmentedResponse(
            200,
            bodyParts,
            bodyPartLengths,
            3,
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_TOO_LARGE);
}

// ----------------------------------------------------------------------------
// Execute une commande locale complete et prepare son enveloppe commune.
//
// Parametres :
// - handler : fonction metier a buffer fixe correspondant a la route.
//
// Retour :
// - vrai apres preparation de la reponse ou de l'erreur de disponibilite.
//
// Effet de bord :
// - peut modifier l'etat du cube selon la commande, puis memorise son resultat.
// ----------------------------------------------------------------------------
static bool localApiRouteCommand(
        int (*handler)(const char*, size_t)) {
    if(localApiParser.bodyLength > 0 && !localApiParser.contentTypeText) {
        localApiPrepareError(LOCAL_API_ERROR_MEDIA_TYPE);
        return true;
    }
    if(localApiCommandActive) {
        localApiPrepareError(LOCAL_API_ERROR_BUSY);
        return true;
    }

    localApiCommandActive = true;
    // Longueur preservee avant que le buffer soit reutilise pour la reponse.
    const size_t commandLength = localApiParser.bodyLength;
    // Code historique commun memorise pour les lectures d'etat ulterieures.
    const int commandResult = recordCommandResult(
        handler(localApiParser.body, commandLength));
    localApiCommandActive = false;

    int bodyLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=1\nresult=%d\n",
        commandResult);
    if(bodyLength < 0 ||
       static_cast<size_t>(bodyLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareResponse(
            commandResult < 0 ? 422 : 200,
            localApiParser.body,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
    return true;
}

// ----------------------------------------------------------------------------
// Decode une frame binaire complete depuis le buffer HTTP deja alloue.
//
// Retour :
// - vrai apres preparation de la reponse commune.
//
// Effet de bord :
// - applique la frame uniquement si son contrat et le mode Stream sont valides.
// ----------------------------------------------------------------------------
static bool localApiRouteStreamFrame(void) {
    if(!localApiParser.contentTypeBinary) {
        localApiPrepareError(LOCAL_API_ERROR_MEDIA_TYPE);
        return true;
    }
    if(localApiParser.bodyLength != STREAM_FRAME_BYTES) {
        localApiPrepareError(LOCAL_API_ERROR_BAD_REQUEST);
        return true;
    }

    // L'affichage appelle animationProcessServices(), donc revient dans ce
    // serveur. Le verrou interdit de retraiter recursivement la meme requete.
    localApiCommandActive = true;
    const int streamResult = streamApplyFrame(
        reinterpret_cast<const uint8_t*>(localApiParser.body),
        localApiParser.bodyLength);
    localApiCommandActive = false;
    if(streamResult < 0) {
        localApiPrepareError(streamResult);
        return true;
    }

    const int bodyLength = snprintf(
        localApiParser.body,
        sizeof(localApiParser.body),
        "v=1\nresult=0\n");
    if(bodyLength < 0 ||
       static_cast<size_t>(bodyLength) >= sizeof(localApiParser.body) ||
       !localApiPrepareResponse(
            200,
            localApiParser.body,
            static_cast<size_t>(bodyLength < 0 ? 0 : bodyLength),
            localApiParser.privateNetworkRequested))
        localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
    return true;
}

// ----------------------------------------------------------------------------
// Indique si le chemin designe une route de commande locale.
//
// Parametres :
// - path : chemin HTTP termine par un caractere nul.
//
// Retour :
// - vrai pour les quatre commandes exposees par la version 1.
// ----------------------------------------------------------------------------
static bool localApiIsCommandPath(const char* path) {
    return strcmp(path, "/api/v1/command") == 0 ||
        strcmp(path, "/api/v1/mode") == 0 ||
        strcmp(path, "/api/v1/text") == 0 ||
        strcmp(path, "/api/v1/cube-painter") == 0;
}

// ----------------------------------------------------------------------------
// Route la requete complete vers les lectures et commandes disponibles.
//
// Retour :
// - vrai si une reponse est preparee, faux si la lecture doit etre differee.
//
// Effet de bord :
// - prepare une lecture, execute une commande complete ou produit une erreur.
// ----------------------------------------------------------------------------
static bool localApiRouteRequest(void) {
    if(localApiParser.method == LOCAL_HTTP_METHOD_OPTIONS) {
        if(!localApiIsKnownPath(localApiParser.path)) {
            localApiPrepareError(LOCAL_API_ERROR_NOT_FOUND);
            return true;
        }
        if(!localApiPrepareResponse(
                204,
                NULL,
                0,
                localApiParser.privateNetworkRequested))
            localApiPrepareError(LOCAL_API_ERROR_INTERNAL);
        return true;
    }

    if(localApiParser.contentTypeBinary &&
       strcmp(localApiParser.path, "/api/v1/stream/frame") != 0) {
        localApiPrepareError(LOCAL_API_ERROR_MEDIA_TYPE);
        return true;
    }

    if(strcmp(localApiParser.path, "/api/v1/health") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_GET)
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
        else
            localApiRouteHealth();
        return true;
    }

    if(strcmp(localApiParser.path, "/api/v1/diagnostics") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_GET) {
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
            return true;
        }
        return localApiRouteDiagnostics(false);
    }

    if(strcmp(localApiParser.path, "/api/v1/diagnostics/reset") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_POST) {
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
            return true;
        }
        if(localApiParser.bodyLength != 0) {
            localApiPrepareError(LOCAL_API_ERROR_BAD_REQUEST);
            return true;
        }
        return localApiRouteDiagnostics(true);
    }

    if(strcmp(localApiParser.path, "/api/v1/state") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_GET) {
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
            return true;
        }
        return localApiRouteState();
    }

    if(strcmp(localApiParser.path, "/api/v1/modes") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_GET)
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
        else
            localApiRouteModes();
        return true;
    }

    if(strcmp(localApiParser.path, "/api/v1/aux-switches") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_GET)
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
        else
            localApiRouteAuxSwitches();
        return true;
    }

    if(strcmp(localApiParser.path, "/api/v1/stream/frame") == 0) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_POST) {
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
            return true;
        }
        return localApiRouteStreamFrame();
    }

    if(localApiIsCommandPath(localApiParser.path)) {
        if(localApiParser.method != LOCAL_HTTP_METHOD_POST) {
            localApiPrepareError(LOCAL_API_ERROR_METHOD);
            return true;
        }
        if(strcmp(localApiParser.path, "/api/v1/command") == 0)
            return localApiRouteCommand(routeCommandFromBuffer);
        if(strcmp(localApiParser.path, "/api/v1/mode") == 0)
            return localApiRouteCommand(setModeFromBuffer);
        if(strcmp(localApiParser.path, "/api/v1/text") == 0)
            return localApiRouteCommand(setTextFromBuffer);
        return localApiRouteCommand(cubePainterFromBuffer);
    }

    localApiPrepareError(LOCAL_API_ERROR_NOT_FOUND);
    return true;
}

// ----------------------------------------------------------------------------
// Accepte un client possedant deja au moins un octet disponible.
//
// Parametres :
// - currentMillis : horodatage du passage courant.
//
// Effet de bord :
// - attribue l'unique parseur au nouveau socket.
// ----------------------------------------------------------------------------
static void localApiAcceptClient(uint32_t currentMillis) {
    TCPClient candidate = localApiServer.available();
    if(!candidate.connected() && candidate.available() <= 0)
        return;
    localApiClient = candidate;
    localApiClientActive = true;
    localApiTransactionStartedMillis = currentMillis;
    localApiLastActivityMillis = currentMillis;
    localApiTransactionStartedMicros = micros();
    localHttpParserReset(&localApiParser);
    localApiResponse.state = LOCAL_API_RESPONSE_IDLE;
}

// ----------------------------------------------------------------------------
// Lit une portion bornee de la requete courante.
//
// Parametres :
// - currentMillis : horodatage du passage courant.
//
// Effet de bord :
// - alimente le parseur jusqu'a sa fin ou sa premiere erreur.
// ----------------------------------------------------------------------------
static void localApiReadRequest(uint32_t currentMillis) {
    size_t processedBytes = 0;
    while(processedBytes < LOCAL_API_BYTES_PER_TICK &&
          localApiClient.available() > 0 &&
          localApiResponse.state == LOCAL_API_RESPONSE_IDLE) {
        int value = localApiClient.read();
        if(value < 0)
            break;
        processedBytes++;
        localApiLastActivityMillis = currentMillis;
        LocalHttpParseResult result = localHttpParserConsume(
            &localApiParser,
            static_cast<uint8_t>(value));
        if(result == LOCAL_HTTP_PARSE_READY)
            break;
        if(result == LOCAL_HTTP_PARSE_ERROR)
            localApiPrepareError(localApiParser.errorCode);
    }
}

// ----------------------------------------------------------------------------
// Ecrit une portion bornee de la reponse courante sans attente TCP.
//
// Parametres :
// - currentMillis : horodatage du passage courant.
//
// Effet de bord :
// - avance les offsets et ferme le client apres le dernier octet.
// ----------------------------------------------------------------------------
static void localApiWriteResponse(uint32_t currentMillis) {
    size_t processedBytes = 0;
    while(processedBytes < LOCAL_API_BYTES_PER_TICK &&
          localApiResponse.state != LOCAL_API_RESPONSE_IDLE) {
        const char* source = NULL;
        uint16_t* sent = NULL;
        uint16_t length = 0;
        if(localApiResponse.state == LOCAL_API_RESPONSE_HEADER) {
            source = localApiResponse.header;
            sent = &localApiResponse.headerSent;
            length = localApiResponse.headerLength;
        }
        else {
            while(localApiResponse.bodyPartIndex <
                      localApiResponse.bodyPartCount &&
                  localApiResponse.bodySent >=
                      localApiResponse.bodyPartLengths[
                          localApiResponse.bodyPartIndex]) {
                localApiResponse.bodyPartIndex++;
                localApiResponse.bodySent = 0;
            }
            if(localApiResponse.bodyPartIndex >=
               localApiResponse.bodyPartCount) {
                localApiCloseClient();
                return;
            }
            source = localApiResponse.bodyParts[
                localApiResponse.bodyPartIndex];
            sent = &localApiResponse.bodySent;
            length = localApiResponse.bodyPartLengths[
                localApiResponse.bodyPartIndex];
        }

        if(*sent >= length) {
            if(localApiResponse.state == LOCAL_API_RESPONSE_HEADER) {
                localApiResponse.state = LOCAL_API_RESPONSE_BODY;
                continue;
            }
            continue;
        }

        size_t remaining = static_cast<size_t>(length - *sent);
        size_t allowance = LOCAL_API_BYTES_PER_TICK - processedBytes;
        size_t writeLength = remaining < allowance ? remaining : allowance;
        size_t written = localApiClient.write(
            reinterpret_cast<const uint8_t*>(source + *sent),
            writeLength,
            0);
        if(written == 0)
            return;
        *sent = static_cast<uint16_t>(*sent + written);
        processedBytes += written;
        localApiLastActivityMillis = currentMillis;
    }
}

// ----------------------------------------------------------------------------
// Initialise le serveur local et ses etats durables au demarrage.
//
// Effet de bord :
// - remet l'ecoute, le client, le verrou et les buffers a leur etat initial.
// ----------------------------------------------------------------------------
void localApiSetup(void) {
    localApiClientActive = false;
    localApiListening = false;
    localApiWiFiWasReady = false;
    localApiLastBeginAttemptMillis = 0;
    localApiDiagnosticsSequence = 0;
    localApiCommandActive = false;
    localHttpParserReset(&localApiParser);
    memset(&localApiResponse, 0, sizeof(localApiResponse));
}

// ----------------------------------------------------------------------------
// Fait progresser une tranche bornee du serveur local.
//
// Effet de bord :
// - gere l'ecoute, la requete ou la reponse de l'unique client courant.
// - ignore les rappels cooperatifs imbriques pendant une commande synchrone.
// ----------------------------------------------------------------------------
void localApiProcess(void) {
    if(localApiCommandActive)
        return;
    uint32_t currentMillis = millis();
    bool wifiReady = WiFi.ready();
    if(!wifiReady) {
        if(localApiClientActive)
            localApiCloseClient();
        localApiListening = false;
        localApiWiFiWasReady = false;
        return;
    }

    if(!localApiWiFiWasReady) {
        localApiWiFiWasReady = true;
        localApiListening = false;
        localApiLastBeginAttemptMillis = currentMillis - LOCAL_API_BEGIN_RETRY_MS;
    }
    if(!localApiListening &&
       static_cast<uint32_t>(currentMillis - localApiLastBeginAttemptMillis) >=
           LOCAL_API_BEGIN_RETRY_MS) {
        localApiLastBeginAttemptMillis = currentMillis;
        localApiListening = localApiServer.begin();
    }
    if(!localApiListening)
        return;

    if(!localApiClientActive) {
        localApiAcceptClient(currentMillis);
        if(!localApiClientActive)
            return;
    }

    uint32_t totalElapsed = static_cast<uint32_t>(
        currentMillis - localApiTransactionStartedMillis);
    uint32_t idleElapsed = static_cast<uint32_t>(
        currentMillis - localApiLastActivityMillis);
    if(totalElapsed >= LOCAL_API_TOTAL_TIMEOUT_MS) {
        if(localApiResponse.state == LOCAL_API_RESPONSE_IDLE) {
            localApiPrepareError(LOCAL_API_ERROR_TIMEOUT);
            if(!localApiClientActive)
                return;
            idleElapsed = 0;
        }
        else if(!localApiResponse.timeoutPrepared) {
            localApiCloseClient();
            return;
        }
    }
    if(idleElapsed >= LOCAL_API_IDLE_TIMEOUT_MS &&
       localApiParser.state != LOCAL_HTTP_PARSER_READY) {
        if(localApiResponse.state == LOCAL_API_RESPONSE_IDLE) {
            localApiPrepareError(LOCAL_API_ERROR_TIMEOUT);
            if(!localApiClientActive)
                return;
            idleElapsed = 0;
        }
        else {
            localApiCloseClient();
            return;
        }
    }

    if(localApiResponse.state == LOCAL_API_RESPONSE_IDLE)
        localApiReadRequest(currentMillis);
    if(localApiResponse.state == LOCAL_API_RESPONSE_IDLE &&
       localApiParser.state == LOCAL_HTTP_PARSER_READY)
        localApiRouteRequest();
    if(localApiResponse.state != LOCAL_API_RESPONSE_IDLE)
        localApiWriteResponse(currentMillis);
    else if(!localApiClient.connected() && localApiClient.available() <= 0)
        localApiCloseClient();
}

#endif

#endif
