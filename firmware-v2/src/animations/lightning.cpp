// ============================================================================
// Lightning - Implémentation des éclairs utilisés par Rain
// ----------------------------------------------------------------------------
// Ce fichier dessine un éclair ponctuel avec les primitives bornées. Le choix
// de sa fréquence et son activation par switch restent dans Rain.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Dessine puis efface un éclair ramifié avec quatre intensités.
//
// Effet de bord :
// - consomme des tirages aléatoires, affiche directement quatre éclats, attend
//   leurs délais historiques puis efface les segments.
// ----------------------------------------------------------------------------
void lightning() {
    Point p1 = { rand()%SIDE, SIDE-1, rand()%SIDE };
    Point p2 = { rand()%SIDE, rand()%3, rand()%SIDE };
    Point p3 = { rand()%4-2+p2.x, 0, rand()%4-2+p2.z };
    Point p4 = { rand()%4-2+p2.x, 0, rand()%4-2+p2.z };
    
    Color clr[4];
    clr[0] = Color(rand()%2, rand()%2, rand()%16);
    clr[1] = Color(255, 255, 255);
    clr[2] = Color(128, 128, 128);
    clr[3] = Color(0, 0, 2);
    
    for (int i=0; i<4; i++) {
        drawLine(p1, p2, clr[i]);
        drawLine(p2, p3, clr[i]);
        drawLine(p2, p4, clr[i]);
        drawLine(p3, p4, clr[i]);
        strip.show();
        delay(random(1/speed, speed*.65));
    }
    delay(random(speed*.125, speed*.65));
    drawLine(p1, p2, black);
    drawLine(p2, p3, black);
    drawLine(p2, p4, black);
    drawLine(p3, p4, black);
    
	if(stop || stopDemo) {return;}
    showPixels();
}

/* Inspired by Kevin's musically inclined work neighbor
 * This mode simulates halogen stage lights turning On and then Off
 * They start off redish-orange and warm up to bright white
 */

#endif
