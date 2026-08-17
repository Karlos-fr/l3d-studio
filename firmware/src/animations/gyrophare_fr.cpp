// ============================================================================
// GyrophareFr - Implementation du gyrophare tournant francais
// ----------------------------------------------------------------------------
// Ce fichier dessine deux faisceaux opposes autour de l'axe vertical. Il evite
// FFT, trigonometrie runtime, allocation dynamique et attente bloquante.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Nombre d'orientations entieres parcourues pendant un tour complet.
const uint8_t GYROPHARE_DIRECTION_COUNT = 8;

// Nombre d'echantillons courts utilises pour estimer l'amplitude sonore.
const uint8_t GYROPHARE_AUDIO_SAMPLE_COUNT = 4;

// Intensite minimale gardant le gyrophare visible dans une piece silencieuse.
const uint8_t GYROPHARE_MIN_INTENSITY = 96;

// Part de l'enveloppe precedente conservee entre deux frames audio.
const uint8_t GYROPHARE_ENVELOPE_DECAY_NUMERATOR = 7;

// Diviseur associe au coefficient de decroissance de l'enveloppe.
const uint8_t GYROPHARE_ENVELOPE_DECAY_DENOMINATOR = 8;

// Diviseur convertissant l'amplitude ADC en intensite RGB complementaire.
const uint8_t GYROPHARE_AUDIO_SCALE_DIVISOR = 4;

// Numerateur d'attenuation d'une trainee a chaque nouvelle orientation.
const uint8_t GYROPHARE_TRAIL_DECAY_NUMERATOR = 1;

// Denominateur d'attenuation d'une trainee a chaque nouvelle orientation.
const uint8_t GYROPHARE_TRAIL_DECAY_DENOMINATOR = 2;

// Composantes x des huit directions successives du faisceau.
static const int8_t GYROPHARE_DIRECTION_X[GYROPHARE_DIRECTION_COUNT] = {
    1, 1, 0, -1, -1, -1, 0, 1};

// Composantes z des huit directions successives du faisceau.
static const int8_t GYROPHARE_DIRECTION_Z[GYROPHARE_DIRECTION_COUNT] = {
    0, 1, 1, 1, 0, -1, -1, -1};

// Orientation courante du gyrophare, comprise entre zero et sept.
static uint8_t gyrophareDirectionIndex;

// Prochaine date a laquelle la rotation peut avancer.
static uint32_t gyrophareNextFrameAt;

// Enveloppe audio decroissante utilisee uniquement avec le deuxieme switch.
static uint16_t gyrophareAudioEnvelope;

// ----------------------------------------------------------------------------
// Indique si la prochaine frame du gyrophare est due malgre millis debordant.
//
// Parametres :
// - now : date courante fournie par millis().
// - deadline : date attendue pour la prochaine orientation.
//
// Retour :
// - vrai lorsque la date est atteinte ou depassee.
// ----------------------------------------------------------------------------
static bool isGyrophareFrameDue(uint32_t now, uint32_t deadline) {
    return static_cast<int32_t>(now - deadline) >= 0;
}

// ----------------------------------------------------------------------------
// Estime l'amplitude sonore sans analyse frequentielle.
//
// Retour :
// - plus grand ecart absolu observe autour du biais ADC.
//
// Effet de bord :
// - effectue quatre lectures rapprochees du microphone.
// ----------------------------------------------------------------------------
static uint16_t sampleGyrophareAmplitude() {
    uint16_t peak = 0;
    for (uint8_t index = 0; index < GYROPHARE_AUDIO_SAMPLE_COUNT; index++) {
        // Ecart signe entre la lecture courante et le biais du microphone.
        int32_t sample = analogRead(MICROPHONE) - SAMPLES;
        if (sample < 0) {
            sample = -sample;
        }
        if (static_cast<uint32_t>(sample) > peak) {
            peak = static_cast<uint16_t>(sample);
        }
    }
    return peak;
}

// ----------------------------------------------------------------------------
// Calcule l'intensite de la frame selon le switch de reaction sonore.
//
// Retour :
// - intensite comprise entre 96 et 255 lorsque l'audio est actif, sinon 255.
//
// Effet de bord :
// - actualise l'enveloppe audio persistante lorsque `switch2` est actif.
// ----------------------------------------------------------------------------
static uint8_t gyrophareFrameIntensity() {
    if (!switch2) {
        return 255;
    }

    // Pic observe pendant les quatre lectures de la frame.
    const uint16_t peak = sampleGyrophareAmplitude();
    // Niveau precedent apres sa decroissance exponentielle entiere.
    const uint16_t decayed =
        gyrophareAudioEnvelope * GYROPHARE_ENVELOPE_DECAY_NUMERATOR /
        GYROPHARE_ENVELOPE_DECAY_DENOMINATOR;
    gyrophareAudioEnvelope = peak > decayed ? peak : decayed;

    // Plage RGB disponible au-dessus du minimum visible.
    const uint16_t available = 255 - GYROPHARE_MIN_INTENSITY;
    // Contribution audio bornee ajoutee a l'intensite minimale.
    uint16_t addition = gyrophareAudioEnvelope /
        GYROPHARE_AUDIO_SCALE_DIVISOR;
    if (addition > available) {
        addition = available;
    }
    return GYROPHARE_MIN_INTENSITY + addition;
}

// ----------------------------------------------------------------------------
// Attenue le framebuffer pour former une trainee courte.
//
// Effet de bord :
// - divise chaque canal logique par deux avant le nouveau faisceau.
// ----------------------------------------------------------------------------
static void fadeGyrophareTrail() {
    for (uint8_t x = 0; x < SIDE; x++) {
        for (uint8_t y = 0; y < SIDE; y++) {
            for (uint8_t z = 0; z < SIDE; z++) {
                Color color = getPixelColor(x, y, z);
                color.red = static_cast<uint16_t>(color.red) *
                    GYROPHARE_TRAIL_DECAY_NUMERATOR /
                    GYROPHARE_TRAIL_DECAY_DENOMINATOR;
                color.green = static_cast<uint16_t>(color.green) *
                    GYROPHARE_TRAIL_DECAY_NUMERATOR /
                    GYROPHARE_TRAIL_DECAY_DENOMINATOR;
                color.blue = static_cast<uint16_t>(color.blue) *
                    GYROPHARE_TRAIL_DECAY_NUMERATOR /
                    GYROPHARE_TRAIL_DECAY_DENOMINATOR;
                setPixelColor(x, y, z, color);
            }
        }
    }
}

// ----------------------------------------------------------------------------
// Dessine les deux demi-faisceaux de l'orientation courante.
//
// Parametres :
// - intensity : valeur maximale des canaux rouge ou bleu.
//
// Effet de bord :
// - ecrit un plan vertical borne dans le framebuffer logique.
// ----------------------------------------------------------------------------
static void drawGyrophareBeams(uint8_t intensity) {
    // Composante x de l'orientation courante.
    const int8_t directionX =
        GYROPHARE_DIRECTION_X[gyrophareDirectionIndex];
    // Composante z de l'orientation courante.
    const int8_t directionZ =
        GYROPHARE_DIRECTION_Z[gyrophareDirectionIndex];
    // Demi-largeur corrigee pour garder les diagonales visibles.
    const uint8_t width = directionX != 0 && directionZ != 0 ? 2 : 1;

    for (uint8_t x = 0; x < SIDE; x++) {
        // Position x doublee autour du centre situe entre les voxels 3 et 4.
        const int8_t centeredX = static_cast<int8_t>(x * 2) - (SIDE - 1);
        for (uint8_t z = 0; z < SIDE; z++) {
            // Position z doublee autour du centre situe entre les voxels 3 et 4.
            const int8_t centeredZ = static_cast<int8_t>(z * 2) - (SIDE - 1);
            int16_t cross = centeredX * directionZ - centeredZ * directionX;
            if (cross < 0) {
                cross = -cross;
            }
            if (cross > width) {
                continue;
            }

            // Intensite anti-aliassee des deux lignes voisines en diagonale.
            const uint8_t beamIntensity =
                directionX != 0 && directionZ != 0 && cross != 0
                ? intensity / 2
                : intensity;
            // Projection signee choisissant le demi-faisceau oppose.
            const int16_t along =
                centeredX * directionX + centeredZ * directionZ;
            // Couleur bleue par defaut, rouge sur le cote oppose en bicolore.
            const Color beamColor = switch1 && along < 0
                ? Color(beamIntensity, 0, 0)
                : Color(0, 0, beamIntensity);
            for (uint8_t y = 0; y < SIDE; y++) {
                setPixelColor(x, y, z, beamColor);
            }
        }
    }
}

// ----------------------------------------------------------------------------
// Reinitialise la rotation et l'enveloppe sonore du gyrophare.
//
// Effet de bord :
// - force le rendu de la premiere orientation au prochain tick.
// ----------------------------------------------------------------------------
void resetGyrophareFr() {
    gyrophareDirectionIndex = 0;
    gyrophareNextFrameAt = 0;
    gyrophareAudioEnvelope = 0;
}

// ----------------------------------------------------------------------------
// Affiche une frame due du gyrophare tournant.
//
// Effet de bord :
// - lit eventuellement le microphone, modifie le framebuffer et l'affiche.
// ----------------------------------------------------------------------------
void runGyrophareFr() {
    run = TRUE;
    // Date unique utilisee pour verifier puis programmer la frame.
    const uint32_t now = millis();
    if (!isGyrophareFrameDue(now, gyrophareNextFrameAt)) {
        return;
    }

    if (switch3) {
        fadeGyrophareTrail();
    } else {
        background(black);
    }
    drawGyrophareBeams(gyrophareFrameIntensity());
    showPixels();

    gyrophareDirectionIndex =
        (gyrophareDirectionIndex + 1) % GYROPHARE_DIRECTION_COUNT;
    gyrophareNextFrameAt = now + 20 + speed;
}

#endif
