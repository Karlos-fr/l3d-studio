// ============================================================================
// Whirlwind - Implémentation du tourbillon de points colorés
// ----------------------------------------------------------------------------
// Ce fichier anime les points du tourbillon dans le scratch partagé. Il
// conserve la répétition historique des déplacements et le choix des couleurs.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Calcule et affiche une frame du tourbillon.
//
// Effet de bord :
// - réinitialise périodiquement les points, modifie leur position, écrit le
//   framebuffer, l'affiche puis applique le délai historique.
// ----------------------------------------------------------------------------
void whirlWind() {
    // Nombre historique de divisions angulaires d'un tour complet.
    const int arcs = 180;
    run = TRUE;

    if (millis() - lastSwap > CYCLE_INTERVAL) {
        lastSwap = millis();
        for (int i = 0; i < MAX_DOTS; i++) {
            whirlwindHeights[i] = random(SIDE);
            whirlwindRadii[i] =
                random(MIN_RADI, MAX_RADI) + randomDecimal();
            whirlwindAngles[i] = randomDecimal() * 2 * PI;
            randomPackedColor(&whirlwindColors[i]);
        }
    }

    background(black);

    // La boucle externe répète historiquement 19 fois dessin et déplacement.
    for (int pass = 0; pass < MAX_DOTS; pass++) {
        // Dessine tous les points avec leur position courante.
        for (int i = 0; i < MAX_DOTS; i++) {
            setPixelColor(
                center.x + whirlwindRadii[i] * cos(whirlwindAngles[i]),
                whirlwindHeights[i],
                center.z + whirlwindRadii[i] * sin(whirlwindAngles[i]),
                Color{
                    whirlwindColors[i].red,
                    whirlwindColors[i].green,
                    whirlwindColors[i].blue});
        }
        if (stop || stopDemo) {
            return;
        }

        // Avance tous les points selon la trajectoire historique.
        for (int i = 0; i < MAX_DOTS; i++) {
            whirlwindAngles[i] += 2 * PI / arcs;
            if (whirlwindAngles[i] > 2 * PI) {
                whirlwindAngles[i] -= 2 * PI;
            }

            whirlwindRadii[i] += randomDecimal() / 200;
            whirlwindHeights[i] += randomDecimal() / 100;

            if (whirlwindHeights[i] > SIDE ||
                whirlwindRadii[i] > MAX_RADI) {
                whirlwindHeights[i] = 0;
                whirlwindRadii[i] = MIN_RADI;
            }
        }
        if (stop || stopDemo) {
            return;
        }
    }
    showPixels();
    delay(speed * .5);
}

// ----------------------------------------------------------------------------
// Choisit une couleur aléatoire distincte des deux familles précédentes.
//
// Parametres :
// - color : couleur de point à renseigner.
//
// Effet de bord :
// - consomme le générateur aléatoire et actualise les deux familles mémorisées.
// ----------------------------------------------------------------------------
void randomColor(struct Color* color) {
    int randomFamily;
    do {
        randomFamily = random(7);
    } while (randomFamily == lastRand || randomFamily == lastLastRand);

    switch (randomFamily) {
        case 0:
            color->red = random(3, 128);
            color->green = random(3, 128);
            color->blue = random(3, 128);
            break;
        case 1:
            color->red = random(3, 128);
            color->green = random(2);
            color->blue = random(2);
            break;
        case 2:
            color->red = random(2);
            color->green = random(3, 128);
            color->blue = random(2);
            break;
        case 3:
            color->red = random(2);
            color->green = random(2);
            color->blue = random(3, 128);
            break;
        case 4:
            color->red = random(2);
            color->green = random(3, 128);
            color->blue = random(3, 128);
            break;
        case 5:
            color->red = random(3, 128);
            color->green = random(2);
            color->blue = random(3, 128);
            break;
        case 6:
            color->red = random(3, 128);
            color->green = random(3, 128);
            color->blue = random(2);
            break;
    }
    lastLastRand = lastRand;
    lastRand = randomFamily;
}

// ----------------------------------------------------------------------------
// Choisit une couleur Whirlwind et la copie dans sa représentation triviale.
//
// Parametres :
// - color : couleur compacte à renseigner dans le scratch partagé.
//
// Effet de bord :
// - consomme le même générateur aléatoire et actualise les familles mémorisées.
// ----------------------------------------------------------------------------
void randomPackedColor(PackedColor* color) {
    // Couleur historique temporaire compatible avec le helper partagé.
    Color generatedColor;
    randomColor(&generatedColor);
    color->red = generatedColor.red;
    color->green = generatedColor.green;
    color->blue = generatedColor.blue;
}

#endif
