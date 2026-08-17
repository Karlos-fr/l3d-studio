// ============================================================================
// RainSalvos - Implementation compacte de GoldRain et AcidRain
// ----------------------------------------------------------------------------
// Ce fichier conserve huit salves de 128 gouttes sans float ni drapeau par
// goutte. AcidRain reste masqué par le registre historique des modes.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Convertit la position verticale fixe d'une goutte en coordonnée logique.
//
// Parametres :
// - drop : goutte active dont la position est positive ou nulle.
//
// Retour :
// - coordonnée Y tronquée comme la conversion float historique.
// ----------------------------------------------------------------------------
CubeCoordinate rainLogicalY(const CompactRainDrop& drop) {
  // Coordonnée exacte avant reproduction des deux arrondis float historiques.
  const CubeCoordinate exactY =
    static_cast<CubeCoordinate>(drop.yTwentieths / RAIN_POSITION_SCALE);
  if ((drop.speedTwentieths == 3 || drop.speedTwentieths == 6) &&
      (drop.yTwentieths == 100 || drop.yTwentieths == 40)) {
    return exactY - 1;
  }
  return exactY;
}

// ----------------------------------------------------------------------------
// Actualise la couleur verticale d'une goutte AcidRain.
//
// Parametres :
// - drop : goutte active à recolorer selon sa hauteur.
//
// Effet de bord :
// - modifie drop.color et consomme les mêmes tirages aléatoires près du sol.
// ----------------------------------------------------------------------------
void updateAcidRainColor(CompactRainDrop& drop) {
  // Hauteur entière équivalente aux intervalles float historiques.
  const CubeCoordinate logicalY = rainLogicalY(drop);
  if (logicalY < 0 || logicalY >= SIDE - 1) {
    return;
  }

  if (ledColor < 200) {
    switch (logicalY) {
      case 6: drop.color = Color(0, 10, 90); break;
      case 5: drop.color = Color(0, 0, 100); break;
      case 4: drop.color = Color(10, 0, 110); break;
      case 3: drop.color = Color(30, 0, 120); break;
      case 2: drop.color = Color(100, 0, 150); break;
      case 1: drop.color = Color(100, 0, 100); break;
      case 0: drop.color = Color(random(100, 161), 0, 10); break;
    }
    return;
  }

  switch (logicalY) {
    case 6: drop.color = Color(100, 100, 0); break;
    case 5: drop.color = Color(150, 50, 0); break;
    case 4: drop.color = Color(150, 20, 0); break;
    case 3: drop.color = Color(150, 10, 0); break;
    case 2: drop.color = Color(150, 0, 0); break;
    case 1: drop.color = Color(120, 0, 0); break;
    case 0: drop.color = Color(random(100, 160), random(0, 21), 0); break;
  }
}

// ----------------------------------------------------------------------------
// Exécute une frame de la famille GoldRain ou AcidRain.
//
// Effet de bord :
// - lance, actualise et dessine les salves, puis applique les fondus et le délai
//   historiques du mode courant.
// ----------------------------------------------------------------------------
void acidRain() {
  run = TRUE;

  switch (currentModeID) {
    case ACIDRAIN:
      fadeSmooth(1, SIDE, 0.125);
      break;
    case GOLDRAIN:
      fadeSmooth(0, SIDE - 1, 0.08);
      break;
  }

  if (switch1) {
    checkMicrohpone();
  } else if ((timeAboveThreshhold - millis()) > MIN_SALVO_SPACING) {
    timeAboveThreshhold = millis();
    srand(timeAboveThreshhold);
    launchRain(random(8, RAIN_MAX_DROPS + 1));
  }

  updateSalvos();
  drawSalvos();

  ledColor++;
  if (ledColor > 400) {
    srand(millis());
    ledColor = 0;
  }
  if ((ledColor % 3) == 0) {
    if (currentModeID == ACIDRAIN) {
      fadeSmooth(0, 1, 0.06);
    }
    if (currentModeID == GOLDRAIN) {
      fadeSmooth(SIDE - 1, SIDE, 0.18);
    }
  }

  if (stop || demo) {
    return;
  }
  delay(speed);
  showPixels();
}

// ----------------------------------------------------------------------------
// Échantillonne le microphone et actualise le niveau utilisé par AcidRain.
//
// Effet de bord :
// - met à jour les statistiques audio, le debug borné et lance une salve.
// ----------------------------------------------------------------------------
void checkMicrohpone() {
  // Nombre historique d'échantillons lus pour une mesure audio.
  const uint8_t NUM_SAMPLES = 5;
  int runningAverage = 0;

  for (uint8_t index = 0; index < NUM_SAMPLES; index++) {
    int sample = analogRead(MICROPHONE) - SAMPLES;
    if (sample < 0) {
      sample = 0;
    }
    if (sample > maxVal) {
      maxVal = sample;
      runningAverage += sample;
    }
    if (stop || stopDemo) {
      return;
    }
  }

  runningAverage /= NUM_SAMPLES;
  boundedTextFormat(debug, sizeof(debug), "%f", maxVal);
  if (maxVal >= 650) {
    maxVal -= maxVal * 0.0625;
  }
  if (maxVal < 650 && maxVal > 450) {
    maxVal -= 0.9;
  }
  if (maxVal < 450) {
    maxVal += 0.5;
  }
  launchRain(runningAverage);
}

// ----------------------------------------------------------------------------
// Initialise une salve libre à partir d'une amplitude audio ou aléatoire.
//
// Parametres :
// - amplitude : niveau converti en nombre de gouttes entre zéro et 128.
//
// Effet de bord :
// - remplit la première salve inactive en conservant l'ordre des tirages
//   aléatoires de vitesse, position et couleur.
// ----------------------------------------------------------------------------
void launchRain(int amplitude) {
  uint8_t salvoIndex = 0;
  while (salvoIndex < SIDE && salvos[salvoIndex].dropCount != 0) {
    salvoIndex++;
  }
  if (salvoIndex >= SIDE) {
    return;
  }

  if (!switch1 && amplitude > maxVal) {
    maxVal = amplitude;
  }

  int mappedDropCount = map(amplitude, 0, static_cast<int>(maxVal), 0, RAIN_MAX_DROPS);
  if (mappedDropCount < 0) {
    mappedDropCount = 0;
  }
  if (mappedDropCount > RAIN_MAX_DROPS) {
    mappedDropCount = RAIN_MAX_DROPS;
  }

  // Nombre de gouttes borné et représentable sur un octet.
  const uint8_t dropCount = static_cast<uint8_t>(mappedDropCount);
  salvos[salvoIndex].dropCount = dropCount;

  for (uint8_t dropIndex = 0; dropIndex < dropCount; dropIndex++) {
    CompactRainDrop& drop = salvos[salvoIndex].drops[dropIndex];
    drop.speedTwentieths = setNewSpeed();
    drop.x = rand() % SIDE;
    drop.z = rand() % SIDE;
    drop.yTwentieths = RAIN_INITIAL_Y;

    switch (currentModeID) {
      case GOLDRAIN: {
        uint8_t red = random(95, 128);
        uint8_t green = random(80, 96);
        uint8_t blue = random(16, 26);
        drop.color = Color(red, green, blue);
        break;
      }
      case ACIDRAIN:
        drop.color = ledColor < 200
          ? Color(0, 50, 150)
          : Color(150, 150, 0);
        break;
    }
  }
}

// ----------------------------------------------------------------------------
// Réinitialise toutes les salves sans parcourir les 1 024 gouttes.
//
// Effet de bord :
// - invalide chaque salve par son compteur et réinitialise la couleur AcidRain.
// ----------------------------------------------------------------------------
void initSalvos() {
  srand(millis());
  if (currentModeID == ACIDRAIN) {
    ledColor = 0;
  }
  for (uint8_t salvoIndex = 0; salvoIndex < SIDE; salvoIndex++) {
    salvos[salvoIndex].dropCount = 0;
  }
}

// ----------------------------------------------------------------------------
// Dessine les gouttes encore présentes dans le cube.
//
// Effet de bord :
// - actualise les couleurs AcidRain et écrit les gouttes et leur reflet au sol.
// ----------------------------------------------------------------------------
void drawSalvos() {
  for (uint8_t salvoIndex = 0; salvoIndex < SIDE; salvoIndex++) {
    CompactRainSalvo& salvo = salvos[salvoIndex];
    for (uint8_t dropIndex = 0; dropIndex < salvo.dropCount; dropIndex++) {
      CompactRainDrop& drop = salvo.drops[dropIndex];
      if (drop.yTwentieths < 0) {
        continue;
      }

      if (currentModeID == ACIDRAIN) {
        updateAcidRainColor(drop);
        if (ledColor < 200) {
          setPixelColor(drop.x, 0, drop.z, Color(random(100, 161), 0, 10));
        } else {
          setPixelColor(
            drop.x,
            0,
            drop.z,
            Color(random(100, 160), random(0, 21), 0)
          );
        }
      }

      setPixelColor(drop.x, rainLogicalY(drop), drop.z, drop.color);
    }
  }
}

// ----------------------------------------------------------------------------
// Avance toutes les gouttes initialisées et libère les salves terminées.
//
// Effet de bord :
// - décrémente les positions fixes, actualise la lueur GoldRain et remet le
//   compteur d'une salve à zéro lorsque toutes ses gouttes sont sous le cube.
// ----------------------------------------------------------------------------
void updateSalvos() {
  for (uint8_t salvoIndex = 0; salvoIndex < SIDE; salvoIndex++) {
    CompactRainSalvo& salvo = salvos[salvoIndex];
    bool hasActiveDrop = false;
    for (uint8_t dropIndex = 0; dropIndex < salvo.dropCount; dropIndex++) {
      CompactRainDrop& drop = salvo.drops[dropIndex];
      drop.yTwentieths -= drop.speedTwentieths;
      if (drop.yTwentieths >= 0) {
        hasActiveDrop = true;
      }

      if (currentModeID == GOLDRAIN) {
        drop.color.red += 1;
        drop.color.green += 1;
        if (drop.speedTwentieths == 10) {
          drop.color.blue += 1;
        }
      }
    }

    if (!hasActiveDrop) {
      salvo.dropCount = 0;
    }
  }
}

// ----------------------------------------------------------------------------
// Tire une des sept vitesses historiques en vingtièmes de voxel par frame.
//
// Retour :
// - vitesse exacte parmi 2, 3, 4, 5, 6, 7 ou 10 vingtièmes.
// ----------------------------------------------------------------------------
uint8_t setNewSpeed() {
  switch (random(0, 7)) {
    case 0: return 10;
    case 1: return 3;
    case 2: return 2;
    case 3: return 5;
    case 4: return 4;
    case 5: return 7;
    case 6: return 6;
  }
  return 2;
}

#endif
