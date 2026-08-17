// ============================================================================
// CheerLights - Implementation HTTP bornee du mode reseau
// ----------------------------------------------------------------------------
// Ce fichier interroge le canal ThingSpeak historique sans String dynamique.
// Il conserve les transitions visuelles dans les modules d'animation existants.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Vide la réponse CheerLights fixe.
//
// Effet de bord :
// - remet la longueur à zéro et garantit une chaîne C terminée.
// ----------------------------------------------------------------------------
void resetCheerLightsResponse() {
  cheerLightsResponseLength = 0;
  cheerLightsResponse[0] = '\0';
}

// ----------------------------------------------------------------------------
// Ajoute un caractère à la réponse sans dépasser ses huit octets.
//
// Parametres :
// - character : caractère HTTP reçu après les en-têtes.
//
// Effet de bord :
// - conserve les sept premiers caractères et sature la longueur à huit pour
//   signaler toute réponse trop longue.
// ----------------------------------------------------------------------------
void appendCheerLightsResponse(char character) {
  if (cheerLightsResponseLength < CHEERLIGHTS_RESPONSE_CAPACITY - 1) {
    cheerLightsResponse[cheerLightsResponseLength] = character;
    cheerLightsResponseLength++;
    cheerLightsResponse[cheerLightsResponseLength] = '\0';
    return;
  }
  cheerLightsResponseLength = CHEERLIGHTS_RESPONSE_CAPACITY;
  cheerLightsResponse[CHEERLIGHTS_RESPONSE_CAPACITY - 1] = '\0';
}

// ----------------------------------------------------------------------------
// Indique si la réponse possède les sept caractères historiques attendus.
//
// Retour :
// - vrai uniquement pour une réponse de longueur exacte sept.
// ----------------------------------------------------------------------------
bool hasValidCheerLightsResponse() {
  return cheerLightsResponseLength == CHEERLIGHTS_RESPONSE_CAPACITY - 1;
}

// ----------------------------------------------------------------------------
// Rétablit la connexion Cloud puis TCP vers le service CheerLights.
//
// Retour :
// - vrai lorsque le client TCP est connecté après les attentes bornées.
//
// Effet de bord :
// - ferme la socket précédente et peut demander une reconnexion Particle Cloud.
// ----------------------------------------------------------------------------
bool connectCheerLightsClient() {
  client.stop();
  if (!Particle.connected()) {
    Particle.connect();
    connected = waitFor(Particle.connected, 1500);
    if (!connected) {
      return false;
    }
  }

  client.connect(CHEERLIGHTS_HOST, CHEERLIGHTS_HTTP_PORT);
  connected = waitFor(client.connected, 1500);
  return connected;
}

// ----------------------------------------------------------------------------
// Récupère et affiche la couleur courante du service CheerLights.
//
// Effet de bord :
// - utilise le réseau, actualise les LED, les diagnostics HTTP et les états de
//   connexion ; toutes les attentes réseau restent bornées historiquement.
// ----------------------------------------------------------------------------
void cheerlights() {
  int red;
  int green;
  int blue;
  bool headers;
  char lastChar;
  run = TRUE;

  if ((millis() - pollTime) <= CHEERLIGHTS_POLLING_INTERVAL) {
    if (stop || stopDemo) {
      demo = FALSE;
      client.stop();
      return;
    }
    if (!Particle.connected() || !client.connected()) {
      connectCheerLightsClient();
      return;
    }

    // La luminosité et les commandes Cloud restent réactives entre deux polls.
    strip.setBrightness(brightness);
    strip.show();
    animationProcessServices();
    delay(100);
    return;
  }

  connected = client.connected();
  if (connected) {
    pollTime = millis();
    client.print("GET ");
    client.print(CHEERLIGHTS_PATH);
    client.println(" HTTP/1.0");
    client.print("Host: ");
    client.println(CHEERLIGHTS_HOST);
    client.println("Content-Length: 0");
    client.println();
    boundedTextCopy(debug, sizeof(debug), "connected");
  } else {
    boundedTextCopy(debug, sizeof(debug), "not connected");
    if (stop || stopDemo) {
      demo = FALSE;
      client.stop();
      return;
    }
    resetCheerLightsResponse();
    connectCheerLightsClient();
  }

  requestTime = millis();
  while (
    client.available() == 0 &&
    (millis() - requestTime) < CHEERLIGHTS_RESPONSE_TIMEOUT
  ) {
    if (stop || stopDemo) {
      demo = FALSE;
      client.stop();
      return;
    }
    animationProcessServices();
  }

  headers = TRUE;
  lastChar = '\n';
  resetCheerLightsResponse();
  while (client.available() > 0) {
    if (stop || stopDemo) {
      demo = FALSE;
      client.stop();
      return;
    }

    // Caractère courant de la réponse TCP.
    const char thisChar = client.read();
    if (!headers) {
      appendCheerLightsResponse(thisChar);
    } else {
      if (thisChar == '\r' && lastChar == '\n') {
        headers = FALSE;
        client.read();
      }
      lastChar = thisChar;
    }
    itoa(client.available(), debug, 10);
  }

  if (hasValidCheerLightsResponse()) {
    red = hexToInt(cheerLightsResponse[1]) * 16 + hexToInt(cheerLightsResponse[2]);
    green = hexToInt(cheerLightsResponse[3]) * 16 + hexToInt(cheerLightsResponse[4]);
    blue = hexToInt(cheerLightsResponse[5]) * 16 + hexToInt(cheerLightsResponse[6]);
    // Couleur RGB décodée depuis les sept caractères de la réponse.
    const Color color = Color(red, green, blue);

    if (color != lastCol) {
      lastCol = color;
      // Couleur empaquetée requise par les transitions historiques concernées.
      const int packedColor = strip.Color(color.red, color.green, color.blue);
      // Transition sélectionnée parmi les six variantes historiques.
      const int transitionIndex = random(0, 6);
      if (stop || stopDemo) {
        demo = FALSE;
        client.stop();
        return;
      }

      switch (transitionIndex) {
        case 0:
          transitionAll(color, POLAR);
          break;
        case 1:
          switch2 = switch3 = FALSE;
          colorZone(packedColor, packedColor, packedColor, packedColor, run);
          break;
        case 2:
          fillX(color);
          break;
        case 3:
          fillY(color);
          break;
        case 4:
          fillZ(color);
          break;
        case 5:
        default:
          // Cette double affectation de switch1 reproduit le code historique.
          switch1 = switch1 = FALSE;
          switch3 = random(2);
          randomPixelFill(packedColor);
          break;
      }
    }
    boundedTextCopy(debug, sizeof(debug), cheerLightsResponse);
    return;
  }

  boundedTextCopy(debug, sizeof(debug), "no reply from host");
  if (stop || stopDemo) {
    demo = FALSE;
    client.stop();
    return;
  }
  resetCheerLightsResponse();
  connectCheerLightsClient();
}

#endif
