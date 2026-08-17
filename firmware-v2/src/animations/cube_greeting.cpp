#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Prepare et affiche une frame de la sequence de bienvenue.
//
// Parametres :
// - textMode : message ou style historique a afficher.
// - frameCount : index de la frame courante.
// - pos : position de defilement du texte.
//
// Effet de bord :
// - remplace le buffer `message` avec une copie bornee et dessine la frame.
// ----------------------------------------------------------------------------
void cubeGreeting(int textMode, int frameCount, float pos) {
    background(black);
    switch(textMode) {
        case(0):	// Show 'L'
            boundedTextCopy(message, sizeof(message), " ");
            thickness = 0;
            showChar(0xB0, Point(ceil((SIDE-1)*.5), ceil((SIDE-1)*.5), ceil((SIDE-1)*.5)), Point(floor((SIDE-1)*.5), ceil((SIDE-1)*.5), ceil((SIDE-1)*.5)), Point(0, pos, 0), getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(1):	// Show '3'
            boundedTextCopy(message, sizeof(message), " ");
            thickness = 0;
            showChar(0x33, Point(1, ceil((SIDE-1)*.5), ceil((SIDE-1)*.5)), Point(0, ceil((SIDE-1)*.5), 0), Point(pos, 0, 0), getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(2):	// Show 'D'
            boundedTextCopy(message, sizeof(message), " ");
            thickness = 0;
            showChar(0xB2, Point(ceil((SIDE-1)*.5), ceil((SIDE-1)*.5), ceil((SIDE-1)*.5)), Point(floor((SIDE-1)*.5), ceil((SIDE-1)*.5), ceil((SIDE-1)*.5)), Point(0, pos, 0), getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(3):
            //thickness = 1;
            //sprintf(message, "Hello from %c%c%c %c ", 0xB0, 0x33, 0xB2, 0xB1);
		thickness = 0;
		boundedTextCopy(message, sizeof(message), "* Welcome  to  Spark Pixels * ");
            marquee(message, pos, getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(4):
            thickness = 1;
            if(Particle.connected())
                boundedTextCopy(message, sizeof(message), "Select a mode from the Spark Pixels app");
            else
                boundedTextCopy(message, sizeof(message), "Not connected to Cloud - modes unavailable");
            scrollText(message, Point(pos - strlen(message), 0, 6), getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(5):
            thickness = 1;
            boundedTextCopy(message, sizeof(message), "Now showcasing...");
            scrollText(message, Point(pos - strlen(message), 0, 6), getColorFromInteger(Wheel(frameCount%500)));
            break;  
        case(6):
            thickness = 1;
            boundedTextCopy(message, sizeof(message), currentModeName);
            scrollText(message, Point(pos - strlen(message), 0, 6), getColorFromInteger(Wheel(frameCount%500)));
            break;  
    }
    showPixels();
}

#endif
