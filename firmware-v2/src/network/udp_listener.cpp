// ============================================================================
// UdpListener - Implémentation optionnelle du récepteur TPM2.net
// ----------------------------------------------------------------------------
// Ce fichier décode les datagrammes du mode Listener. Tout son état et son code
// sont retirés du binaire tant que le mode reste absent du registre actif.
// ============================================================================

#if defined(L3D_UNITY_BUILD) && L3D_LISTENER_ENABLED

// ----------------------------------------------------------------------------
// Lit une frame TPM2.net bornee et la projette sur les voxels du cube.
//
// Effet de bord :
// - lit le socket UDP, actualise les LED et produit un message de debug borne.
// ----------------------------------------------------------------------------
void listen() {
	//some tpm2.net constants
	//const char TPM2NET_HEADER_IDENT    = 0x9C;
	//const char TPM2NET_CMD_DATAFRAME   = 0xDA;
	//const char TPM2NET_CMD_COMMAND     = 0xC0;
	//const char TPM2NET_CMD_ANSWER      = 0xAC;
	//const char TPM2NET_FOOTER_IDENT    = 0x36;
	//const char TPM2NET_PACKET_TIMEOUT  = 0xFA;	// 1/4 of a second
    run = TRUE;
    
    // Checks for the presence of a UDP packet, and reports the buffer size
    unsigned long received_packet_size = Udp.parsePacket();
    /*------------------*/
    /*--- Size check ---*/
    /*------------------*/

    boundedTextFormat(debug, sizeof(debug), "Received: %d Max: %d", received_packet_size, maximum_received_packet);

    if (maximum_received_packet == 0){
        if ((received_packet_size == SINGLE_PLANE_PACKET_SIZE) || (received_packet_size == CUBE_PACKET_SIZE)){
            maximum_received_packet = received_packet_size;
            boundedTextFormat(debug, sizeof(debug), "Got one %d", maximum_received_packet);
        }
    }

    // Do we have sufficient data in the buffer yet?
    if(received_packet_size != maximum_received_packet) {
        // Nope - let's hold for another 500 attempts
        if(countdown < 500) 
            countdown++;
        else {
            // No luck, then let's refresh the buffer
            Udp.stop();
            resetVariables(LISTENER);
        }
        return;
    }
    else {
        // Read correct number of bytes of data from the buffer
        Udp.read(data, maximum_received_packet);

        // Ignore all other chars
        Udp.flush();
        
        /*------------------*/
        /*-- Header check --*/
        /*------------------*/
        // Do we have correct tpm2.net data in the buffer?
        if(data[0] != TPM2NET_HEADER_IDENT) {   // Block Type: Block Start Byte
            // Nope - let's hold for another 500 attempts
            if(countdown < 500) 
                countdown++;
            else {
                // No luck, then let's refresh the buffer
                Udp.stop();
                resetVariables(LISTENER);
            }
            return;
        }
        else {
            /*------------------*/
            /*--- Data check ---*/
            /*------------------*/
            // Do we have a tpm2.net dataframe in the buffer? Or has the user cancelled this mode?
             
 //           sprintf(debug,"%02X, %02X, %02X, %02X",data[0],data[1],data[2],data[3]);

            if((data[1] != TPM2NET_CMD_DATAFRAME) || stop) { // Block Type: Frame Data Packet
                if(stop) {  // Was this a user-requested abort?
                    strip.setBrightness(brightness);
                    Udp.stop();
                    maximum_received_packet = 0;
                    //demo = FALSE;
                }
                else {
                    // Nope - let's hold for another 500 attempts
                    if(countdown < 500) 
                        countdown++;
                    else {
                        // No luck, then let's refresh the buffer
                        Udp.stop();
                        resetVariables(LISTENER);
                    }
                }
                return;
            }
            else {
                countdown = 0;
                // Calculate frame size
                int frameSize = data[2];
                frameSize = (frameSize << 8) + data[3];

 //               sprintf(debug,"%02X, %02X, %02X, %02X - size %d",data[0],data[1],data[2],data[3],frameSize);

 //               sprintf(debug,"Switch = %s, Expected: %d Frame Size: %d",(switch1)?"True":"False",expected_packet_size,frameSize);
 //                sprintf(debug,"Received: %d Frame Size: %d",received_packet_size,frameSize);
        
                // Use packetNumber to calculate offset
                /** GLEDiaTor always sends totalPackets > packetNumber and never updates packetNumber,
                  * Jinx always sends both the same value. So there is no point in considering either.
                char packetNumber = data[4];
                char totalPackets = data[5]; **/
        
                // Calculate offset
                //int index = packetNumber * PIXELS_PER_PANEL;
                int voxelIdx = TPM2NET_HEADER_SIZE; // We set the index pointer to the first frame byte

                // Start drawing!!
                if (received_packet_size == CUBE_PACKET_SIZE){
                    for(int z = 0; z < SIDE; z++) {   // This is 3D - 8x64 - these are the planes
                      for(int x = SIDE-1; x >= 0; x--) {  // rows           
                        for(int y = 0; y < SIDE; y++) {  // Cols         
                        
                            Color pixelColor = Color(data[voxelIdx], data[voxelIdx + 1], data[voxelIdx + 2]);  // Take 3 color bytes from buffer
                            setPixelColor(x, y, z, pixelColor);
                            if(voxelIdx <= (frameSize+TPM2NET_HEADER_SIZE)-3)
                               voxelIdx+=3;  // Increment buffer index by 3 bytes
                            else {
                               // No - bail out, refresh buffer
                               Udp.stop();
                               resetVariables(LISTENER);
                               return;
                            }
                        } // end of cols
                        // Do we still have room to increment?
                        
                     } // end of rows
                    //delay(z*random(36));
                  }  // end of planes
                }
                else {
                for(int z = SIDE-1; z >= 0; z--) {                  // We're only dealing in 2 dimensions (width & height)
                    for(int col = 0; col < SIDE; col++) {           // Linewise, starting from leftmost index
                        for(int row = SIDE - 1; row >= 0; row--) {  // Columnwise, starting from topmost index
                            Color pixelColor = Color(data[voxelIdx], data[voxelIdx + 1], data[voxelIdx + 2]);  // Take 3 color bytes from buffer
                            setPixelColor(z, col, row, pixelColor);
                        }
                        // Do we still have room to increment?
                        if(voxelIdx <= (frameSize+TPM2NET_HEADER_SIZE)-3)
                            voxelIdx+=3;  // Increment buffer index by 3 bytes
                        else {
                            // No - bail out, refresh buffer
                            Udp.stop();
                            resetVariables(LISTENER);
                            return;
                        }
                    }
                    //delay(z*random(36));
                }
                }
                // Display!!
                /** GLEDiaTor always sends totalPackets > packetNumber and never updates packetNumber,
                  * Jinx always sends both the same value. So there is no point in considering either.
                if(packetNumber == totalPackets) { **/
                    if(stop) { 
                        //demo = FALSE;
                        strip.setBrightness(brightness);
                        Udp.stop();
                        maximum_received_packet = 0; 
                        return;
                    }
                    //if(demo) {if(millis() - lastModeSet > twoMinuteInterval) {strip.setBrightness(brightness); return;}}
              		strip.setBrightness(brightness);
                    strip.show();
                    Particle.process();    //process Spark events
                //}
            }
        }
    }
}

/* ======================= AUDIO SPECTRUM mode functions ====================== */

#endif
