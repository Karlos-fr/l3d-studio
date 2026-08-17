// ============================================================================
// CubeTubeFftCommon - Primitives partagees des animations FFT CubeTube
// ----------------------------------------------------------------------------
// Ce fichier declare la capture audio et la palette cyclique des imports
// CubeTube. Il reutilise le scratch Spectrum et ne possede aucun etat permanent.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Echantillonne le microphone puis calcule les 16 magnitudes FFT.
//
// Parametres :
// - sampleDelayMicros : intervalle historique entre deux echantillons.
//
// Effet de bord :
// - ecrase les deux tableaux FFT du scratch partage.
// ----------------------------------------------------------------------------
void captureCubeTubeFft(uint16_t sampleDelayMicros);

// ----------------------------------------------------------------------------
// Produit la palette cyclique bleue, cyan, verte, jaune, rouge et magenta.
//
// Parametres :
// - level : position courante dans la palette.
// - maximumLevel : borne correspondant au retour final vers le bleu.
// - maximumChannel : intensite maximale d'un canal RGB.
//
// Retour :
// - couleur interpolee sans calcul flottant.
// ----------------------------------------------------------------------------
Color cubeTubeColorMap(
    uint16_t level,
    uint16_t maximumLevel,
    uint8_t maximumChannel);
