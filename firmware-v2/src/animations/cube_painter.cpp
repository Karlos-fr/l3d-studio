#ifdef L3D_UNITY_BUILD

int CubePainter(String command) {
	if(currentModeID != CUBE_PAINTER) {return 0;}
    
	int beginIdx = 0;
	//int returnValue = -1;
	int idx = command.indexOf(',');
    int voxelIdx;
    run = TRUE;
    
    // Trim extra spaces
    command.trim();
    // Convert it to upper-case for easier matching
    command.toUpperCase();
    /** DEBUG **/
    //sprintf(debug,"%s", command.c_str());
    
    while(idx != -1) {
        if(command.charAt(beginIdx) == 'I') {
            voxelIdx = (command.substring(beginIdx+1, idx).toInt())*BPP;
        }
        else if(command.charAt(beginIdx) == '#') {
    		// red
    		drawingBuffer[voxelIdx+0] = hexToInt(command.charAt(beginIdx+1))*16+hexToInt(command.charAt(beginIdx+2));
    		// green
    		drawingBuffer[voxelIdx+1] = hexToInt(command.charAt(beginIdx+3))*16+hexToInt(command.charAt(beginIdx+4));
    		// blue
    		drawingBuffer[voxelIdx+2] = hexToInt(command.charAt(beginIdx+5))*16+hexToInt(command.charAt(beginIdx+6));
        }
        else if(command.charAt(beginIdx) == 'C') {
            int startIdx, endIdx;
            startIdx = (command.substring(beginIdx+1, command.indexOf(':', beginIdx)).toInt())*BPP;
            endIdx = (command.substring(command.indexOf(':', beginIdx)+1, idx).toInt())*BPP;
            for(int i=startIdx; i<=endIdx; i+=BPP) {
                strip.setPixelColor(i/BPP, 0);
                drawingBuffer[i+0] = 0; // red
                drawingBuffer[i+1] = 0; // green
                drawingBuffer[i+2] = 0; // blue
                
                // Update the EEPROM storage area with EEPROM.write();
                // We're not using EEPROM.put() due to huge performance impact in updating the cube
                EEPROM.write(i+0, 0);   // red
                EEPROM.write(i+1, 0);   // green
                EEPROM.write(i+2, 0);   // blue
            }
          	return 0;
        }
		beginIdx = idx + 1;
		idx = command.indexOf(',', beginIdx);    
    }
    
    strip.setPixelColor(voxelIdx/BPP, strip.Color(drawingBuffer[voxelIdx], drawingBuffer[voxelIdx+1], drawingBuffer[voxelIdx+2]));
    // Update the EEPROM storage area with EEPROM.write();
    // We're not using EEPROM.put() due to huge performance impact in updating the cube
    EEPROM.write(voxelIdx+0, drawingBuffer[voxelIdx+0]);    // red
    EEPROM.write(voxelIdx+1, drawingBuffer[voxelIdx+1]);    // green
    EEPROM.write(voxelIdx+2, drawingBuffer[voxelIdx+2]);    // blue
    return 0;
}

#include "color_all.cpp"


#endif
