#ifdef L3D_UNITY_BUILD

// ============================================================================
// CubePainter - Implementation des ecritures voxel persistantes
// ----------------------------------------------------------------------------
// Ce module valide les commandes de peinture avant d'ecrire dans le buffer RGB
// ou l'EEPROM. Il n'interprete pas les autres commandes de mode.
// ============================================================================

// ----------------------------------------------------------------------------
// Valide puis applique une commande de couleur ou d'effacement CubePainter.
//
// Parametres :
// - command : segments `I`, couleur hexadecimale ou plage `C`, termines par
//   une virgule.
//
// Retour :
// - zero en cas de succes ou un code COMMAND_ERROR negatif.
//
// Effet de bord :
// - modifie uniquement les voxels valides 0 a 511 et leurs octets EEPROM.
// ----------------------------------------------------------------------------
int CubePainter(String command) {
	if(currentModeID != CUBE_PAINTER) {return 0;}

    // Les espaces exterieurs ne font pas partie du protocole utile.
    command.trim();
    if(command.length() == 0)
        return COMMAND_ERROR_EMPTY;
    if(command.length() > CLOUD_COMMAND_MAX_LENGTH)
        return COMMAND_ERROR_TOO_LONG;
    if(command.charAt(command.length() - 1) != ',')
        return COMMAND_ERROR_MALFORMED;

    command.toUpperCase();

    // La commande complete est controlee avant la premiere ecriture.
    int selectedVoxel = -1;
    int beginIdx = 0;
    int endIdx = command.indexOf(',');
    while(endIdx != -1) {
        if(endIdx <= beginIdx)
            return COMMAND_ERROR_MALFORMED;

        char type = command.charAt(beginIdx);
        if(type == 'I') {
            String indexText = command.substring(beginIdx + 1, endIdx);
            if(!parseUnsignedText(indexText.c_str(), indexText.length(), 0, PIXEL_CNT - 1, &selectedVoxel))
                return COMMAND_ERROR_OUT_OF_RANGE;
        }
        else if(type == '#') {
            if(selectedVoxel < 0 || endIdx - beginIdx != 7 ||
               !isHexText(command.c_str() + beginIdx + 1, 6))
                return COMMAND_ERROR_MALFORMED;
        }
        else if(type == 'C') {
            int colonIdx = command.indexOf(':', beginIdx);
            if(colonIdx <= beginIdx + 1 || colonIdx >= endIdx - 1)
                return COMMAND_ERROR_MALFORMED;
            String startText = command.substring(beginIdx + 1, colonIdx);
            String finishText = command.substring(colonIdx + 1, endIdx);
            int startVoxel = 0;
            int finishVoxel = 0;
            if(!parseUnsignedText(startText.c_str(), startText.length(), 0, PIXEL_CNT - 1, &startVoxel) ||
               !parseUnsignedText(finishText.c_str(), finishText.length(), 0, PIXEL_CNT - 1, &finishVoxel) ||
               startVoxel > finishVoxel)
                return COMMAND_ERROR_OUT_OF_RANGE;
        }
        else {
            return COMMAND_ERROR_MALFORMED;
        }

		beginIdx = endIdx + 1;
		endIdx = command.indexOf(',', beginIdx);
    }
    if(beginIdx != command.length())
        return COMMAND_ERROR_MALFORMED;

    run = TRUE;
    selectedVoxel = -1;
    beginIdx = 0;
    endIdx = command.indexOf(',');
    while(endIdx != -1) {
        char type = command.charAt(beginIdx);
        if(type == 'I') {
            selectedVoxel = command.substring(beginIdx + 1, endIdx).toInt();
        }
        else if(type == '#') {
            int voxelOffset = selectedVoxel * BPP;
            drawingBuffer[voxelOffset] = hexToInt(command.charAt(beginIdx + 1)) * 16 + hexToInt(command.charAt(beginIdx + 2));
            drawingBuffer[voxelOffset + 1] = hexToInt(command.charAt(beginIdx + 3)) * 16 + hexToInt(command.charAt(beginIdx + 4));
            drawingBuffer[voxelOffset + 2] = hexToInt(command.charAt(beginIdx + 5)) * 16 + hexToInt(command.charAt(beginIdx + 6));
            strip.setPixelColor(selectedVoxel, strip.Color(
                drawingBuffer[voxelOffset],
                drawingBuffer[voxelOffset + 1],
                drawingBuffer[voxelOffset + 2]));
            EEPROM.write(voxelOffset, drawingBuffer[voxelOffset]);
            EEPROM.write(voxelOffset + 1, drawingBuffer[voxelOffset + 1]);
            EEPROM.write(voxelOffset + 2, drawingBuffer[voxelOffset + 2]);
        }
        else {
            int colonIdx = command.indexOf(':', beginIdx);
            int startVoxel = command.substring(beginIdx + 1, colonIdx).toInt();
            int finishVoxel = command.substring(colonIdx + 1, endIdx).toInt();
            for(int voxel = startVoxel; voxel <= finishVoxel; voxel++) {
                int voxelOffset = voxel * BPP;
                strip.setPixelColor(voxel, 0);
                drawingBuffer[voxelOffset] = 0;
                drawingBuffer[voxelOffset + 1] = 0;
                drawingBuffer[voxelOffset + 2] = 0;
                EEPROM.write(voxelOffset, 0);
                EEPROM.write(voxelOffset + 1, 0);
                EEPROM.write(voxelOffset + 2, 0);
            }
        }

		beginIdx = endIdx + 1;
		endIdx = command.indexOf(',', beginIdx);
    }
    return 0;
}

#include "color_all.cpp"


#endif
