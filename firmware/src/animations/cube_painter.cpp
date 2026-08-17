// ============================================================================
// CubePainter - Implémentation des écritures voxel persistantes
// ----------------------------------------------------------------------------
// Ce module valide entièrement les commandes de peinture avant d'écrire dans
// le framebuffer ou l'EEPROM. Il ne traite pas les autres commandes Cloud.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Convertit une tranche décimale de la commande sans créer de sous-chaîne.
//
// Parametres :
// - commandText : texte complet de la commande.
// - beginIndex : premier caractère inclus dans la tranche.
// - endIndex : premier caractère exclu de la tranche.
// - value : destination de la valeur convertie.
//
// Retour :
// - vrai lorsque la tranche représente un index de voxel valide.
// ----------------------------------------------------------------------------
bool parsePainterVoxelIndex(
    const char* commandText,
    int beginIndex,
    int endIndex,
    int* value) {
    return parseUnsignedText(
        commandText + beginIndex,
        endIndex - beginIndex,
        0,
        PIXEL_CNT - 1,
        value);
}

// ----------------------------------------------------------------------------
// Valide puis applique une commande de couleur ou d'effacement CubePainter.
//
// Parametres :
// - commandText : debut des segments `I`, couleur ou plage `C`.
// - commandLength : nombre exact de caracteres disponibles.
//
// Retour :
// - zéro en cas de succès ou un code COMMAND_ERROR négatif.
//
// Effet de bord :
// - modifie uniquement les voxels valides 0 à 511 et leurs octets EEPROM.
// ----------------------------------------------------------------------------
int cubePainterFromBuffer(const char* commandText, size_t commandLength) {
    if (currentModeID != CUBE_PAINTER) {
        return 0;
    }

    size_t trimmedBegin = findTrimmedTextBegin(commandText, commandLength);
    size_t trimmedEnd = findTrimmedTextEnd(
        commandText,
        commandLength,
        trimmedBegin);
    if(commandText != NULL)
        commandText += trimmedBegin;
    commandLength = trimmedEnd - trimmedBegin;

    if (commandText == NULL || commandLength == 0) {
        return COMMAND_ERROR_EMPTY;
    }
    if (commandLength > CLOUD_COMMAND_MAX_LENGTH) {
        return COMMAND_ERROR_TOO_LONG;
    }
    if (commandText[commandLength - 1] != ',') {
        return COMMAND_ERROR_MALFORMED;
    }

    // La commande complète est contrôlée avant la première écriture.
    int selectedVoxel = -1;
    int beginIndex = 0;
    int endIndex = findTextCharacter(commandText, commandLength, ',');
    while (endIndex != -1) {
        if (endIndex <= beginIndex) {
            return COMMAND_ERROR_MALFORMED;
        }

        const char type = asciiUpper(commandText[beginIndex]);
        if (type == 'I') {
            if (!parsePainterVoxelIndex(
                    commandText,
                    beginIndex + 1,
                    endIndex,
                    &selectedVoxel)) {
                return COMMAND_ERROR_OUT_OF_RANGE;
            }
        } else if (type == '#') {
            if (selectedVoxel < 0 || endIndex - beginIndex != 7 ||
                !isHexText(commandText + beginIndex + 1, 6)) {
                return COMMAND_ERROR_MALFORMED;
            }
        } else if (type == 'C') {
            const int colonIndex = findTextCharacter(
                commandText,
                commandLength,
                ':',
                static_cast<size_t>(beginIndex));
            if (colonIndex <= beginIndex + 1 || colonIndex >= endIndex - 1) {
                return COMMAND_ERROR_MALFORMED;
            }
            int startVoxel = 0;
            int finishVoxel = 0;
            if (!parsePainterVoxelIndex(
                    commandText,
                    beginIndex + 1,
                    colonIndex,
                    &startVoxel) ||
                !parsePainterVoxelIndex(
                    commandText,
                    colonIndex + 1,
                    endIndex,
                    &finishVoxel) ||
                startVoxel > finishVoxel) {
                return COMMAND_ERROR_OUT_OF_RANGE;
            }
        } else {
            return COMMAND_ERROR_MALFORMED;
        }

        beginIndex = endIndex + 1;
        endIndex = findTextCharacter(
            commandText,
            commandLength,
            ',',
            static_cast<size_t>(beginIndex));
    }
    if (beginIndex != static_cast<int>(commandLength)) {
        return COMMAND_ERROR_MALFORMED;
    }

    run = TRUE;
    selectedVoxel = -1;
    beginIndex = 0;
    endIndex = findTextCharacter(commandText, commandLength, ',');
    while (endIndex != -1) {
        const char type = asciiUpper(commandText[beginIndex]);
        if (type == 'I') {
            parsePainterVoxelIndex(
                commandText,
                beginIndex + 1,
                endIndex,
                &selectedVoxel);
        } else if (type == '#') {
            const int voxelOffset = selectedVoxel * BPP;
            drawingBuffer[voxelOffset] =
                hexToInt(asciiUpper(commandText[beginIndex + 1])) * 16 +
                hexToInt(asciiUpper(commandText[beginIndex + 2]));
            drawingBuffer[voxelOffset + 1] =
                hexToInt(asciiUpper(commandText[beginIndex + 3])) * 16 +
                hexToInt(asciiUpper(commandText[beginIndex + 4]));
            drawingBuffer[voxelOffset + 2] =
                hexToInt(asciiUpper(commandText[beginIndex + 5])) * 16 +
                hexToInt(asciiUpper(commandText[beginIndex + 6]));
            strip.setPixelColor(
                selectedVoxel,
                strip.Color(
                    drawingBuffer[voxelOffset],
                    drawingBuffer[voxelOffset + 1],
                    drawingBuffer[voxelOffset + 2]));
            EEPROM.write(voxelOffset, drawingBuffer[voxelOffset]);
            EEPROM.write(voxelOffset + 1, drawingBuffer[voxelOffset + 1]);
            EEPROM.write(voxelOffset + 2, drawingBuffer[voxelOffset + 2]);
        } else {
            const int colonIndex = findTextCharacter(
                commandText,
                commandLength,
                ':',
                static_cast<size_t>(beginIndex));
            int startVoxel = 0;
            int finishVoxel = 0;
            parsePainterVoxelIndex(
                commandText,
                beginIndex + 1,
                colonIndex,
                &startVoxel);
            parsePainterVoxelIndex(
                commandText,
                colonIndex + 1,
                endIndex,
                &finishVoxel);
            for (int voxel = startVoxel; voxel <= finishVoxel; voxel++) {
                const int voxelOffset = voxel * BPP;
                strip.setPixelColor(voxel, 0);
                drawingBuffer[voxelOffset] = 0;
                drawingBuffer[voxelOffset + 1] = 0;
                drawingBuffer[voxelOffset + 2] = 0;
                EEPROM.write(voxelOffset, 0);
                EEPROM.write(voxelOffset + 1, 0);
                EEPROM.write(voxelOffset + 2, 0);
            }
        }

        beginIndex = endIndex + 1;
        endIndex = findTextCharacter(
            commandText,
            commandLength,
            ',',
            static_cast<size_t>(beginIndex));
    }
    return 0;
}

// ----------------------------------------------------------------------------
// Adapte la fonction Particle CubePainter a la commande metier bornee.
//
// Parametres :
// - command : commande historique fournie par Device OS.
//
// Retour :
// - zero en cas de succes ou un code COMMAND_ERROR negatif.
//
// Effet de bord :
// - delegue les ecritures voxel et EEPROM a cubePainterFromBuffer().
// ----------------------------------------------------------------------------
int CubePainter(String command) {
    return cubePainterFromBuffer(command.c_str(), command.length());
}

#include "color_all.cpp"

#endif
