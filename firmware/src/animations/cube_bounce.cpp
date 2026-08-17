// ============================================================================
// CubeBounce - Implémentation du cube rebondissant
// ----------------------------------------------------------------------------
// Ce fichier déplace un cube de côté deux dans les limites 8 × 8 × 8. Il ne
// gère ni la sélection du mode ni le mapping physique des LED.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Initialise la position et la couleur du cube rebondissant.
//
// Effet de bord :
// - efface le framebuffer, consomme le générateur aléatoire et remet le compteur
//   de frames à zéro.
// ----------------------------------------------------------------------------
void cubeBounce_setup() {
    background(black);
    topLeftVoxel[0] = random(0, SIDE);
    topLeftVoxel[1] = random(0, SIDE);
    topLeftVoxel[2] = random(0, SIDE);
    cubeColor = Color(random(256), random(256), random(256));
    CBframe = 0;
}

// ----------------------------------------------------------------------------
// Déplace, fait rebondir puis affiche le cube courant.
//
// Effet de bord :
// - modifie la position, la direction et parfois la couleur, puis affiche le
//   framebuffer et applique le délai historique.
// ----------------------------------------------------------------------------
void cubeBounce() {
    background(black);
    bool collided = false;

    topLeftVoxel[0] += CBdirection[0];
    topLeftVoxel[1] += CBdirection[1];
    topLeftVoxel[2] += CBdirection[2];

    for (uint8_t axis = 0; axis < 3; axis++) {
        if (topLeftVoxel[axis] < 0 ||
            topLeftVoxel[axis] > SIDE - CUBE_BOUNCE_SIDE) {
            topLeftVoxel[axis] -= 2 * CBdirection[axis];
            CBdirection[axis] = -CBdirection[axis];
            collided = true;
        }
    }

    if (collided) {
        cubeColor = Color(random(256), random(256), random(256));
    }

    CBframe++;
    if (CBframe % 25 == 0) {
        do {
            // La borne supérieure exclusive conserve les valeurs moins un/zéro.
            CBdirection[0] = random(-1, 1);
            CBdirection[1] = random(-1, 1);
            CBdirection[2] = random(-1, 1);
        } while (CBdirection[0] == 0 &&
                 CBdirection[1] == 0 &&
                 CBdirection[2] == 0);
    }

    for (int8_t x = topLeftVoxel[0];
         x < topLeftVoxel[0] + CUBE_BOUNCE_SIDE;
         x++) {
        for (int8_t y = topLeftVoxel[1];
             y < topLeftVoxel[1] + CUBE_BOUNCE_SIDE;
             y++) {
            for (int8_t z = topLeftVoxel[2];
                 z < topLeftVoxel[2] + CUBE_BOUNCE_SIDE;
                 z++) {
                setPixelColor(x, y, z, cubeColor);
            }
        }
    }

    if (stop || stopDemo) {
        return;
    }
    showPixels();
    delay(speed);
    run = TRUE;
}

#endif
