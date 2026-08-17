// ============================================================================
// RainSalvos - Declaration de GoldRain et AcidRain
// ----------------------------------------------------------------------------
// Ce fichier expose le moteur partagé des salves compactes. Le registre des
// modes conserve GoldRain actif et AcidRain masqué.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Convertit la position verticale fixe d'une goutte en coordonnée logique.
//
// Parametres :
// - drop : goutte active dont la position est positive ou nulle.
//
// Retour :
// - coordonnée Y logique tronquée.
// ----------------------------------------------------------------------------
CubeCoordinate rainLogicalY(const CompactRainDrop& drop);

// ----------------------------------------------------------------------------
// Actualise la couleur verticale d'une goutte AcidRain.
//
// Parametres :
// - drop : goutte active à recolorer.
// ----------------------------------------------------------------------------
void updateAcidRainColor(CompactRainDrop& drop);

// ----------------------------------------------------------------------------
// Exécute une frame de la famille GoldRain ou AcidRain.
// ----------------------------------------------------------------------------
void acidRain();

// ----------------------------------------------------------------------------
// Échantillonne le microphone et actualise le niveau utilisé par AcidRain.
// ----------------------------------------------------------------------------
void checkMicrohpone();

// ----------------------------------------------------------------------------
// Initialise une salve libre à partir d'une amplitude audio ou aléatoire.
//
// Parametres :
// - amplitude : niveau converti en nombre de gouttes.
// ----------------------------------------------------------------------------
void launchRain(int amplitude);

// ----------------------------------------------------------------------------
// Réinitialise toutes les salves sans parcourir les 1 024 gouttes.
// ----------------------------------------------------------------------------
void initSalvos();

// ----------------------------------------------------------------------------
// Dessine les gouttes encore présentes dans le cube.
// ----------------------------------------------------------------------------
void drawSalvos();

// ----------------------------------------------------------------------------
// Avance toutes les gouttes initialisées et libère les salves terminées.
// ----------------------------------------------------------------------------
void updateSalvos();

// ----------------------------------------------------------------------------
// Tire une des sept vitesses historiques en vingtièmes de voxel par frame.
//
// Retour :
// - vitesse exacte parmi les sept valeurs historiques.
// ----------------------------------------------------------------------------
uint8_t setNewSpeed();
