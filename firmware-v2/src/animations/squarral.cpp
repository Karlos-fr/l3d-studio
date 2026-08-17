// ============================================================================
// Squarrel - Implementation compacte du parcours carré et de sa traînée
// ----------------------------------------------------------------------------
// Ce fichier anime des coordonnées entières compactes. Les couleurs arc-en-ciel
// restent fournies par les primitives historiques partagées.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Dessine une frame du parcours Squarrel et décale sa traînée.
//
// Effet de bord :
// - modifie position, orientation, couleurs et traînée puis affiche la frame.
// ----------------------------------------------------------------------------
void squarral() {
    Color voxelColor;
    run = TRUE;
    
    if(frame + bound + axis == 0) {
        // Le fondu initial élimine les voxels laissés par le mode précédent.
        for(int idx = 0; idx < PIXEL_CNT; idx++)
            if(strip.getPixelColor(idx) > 0) {
                transition(black, TRUE);
                return;
            }
    }
    
    add(position, increment);
    if((increment.x==1)&&(position.x==SIDE-1-bound))
        increment={0,1,0};
    if((increment.x==-1)&&(position.x==bound))
        increment={0,-1,0};
    if((increment.y==1)&&(position.y==SIDE-1-bound))
        increment={-1,0,0};
    if((increment.y==-1)&&(position.y==bound)) {
        increment={1,0,0};
        position.z+=squarral_zInc;
        bound+=boundInc;
        if((position.z==3)&&(squarral_zInc>0))
          boundInc=0;
        if((position.z==4)&&(squarral_zInc>0))
          boundInc=-1;
        if((position.z==3)&&(squarral_zInc<0))
          boundInc=-1;
        if((position.z==4)&&(squarral_zInc<0))
          boundInc=0;
        if((position.z==0)||(position.z==SIDE-1))
            boundInc*=-1;
        if((position.z==SIDE-1)||(position.z==0)) {
            squarral_zInc*=-1;
            if(squarral_zInc==1) {
                axis=rand()%6;
                if(rand()%3==0)
                    rainbowColor=TRUE;
                else
                    rainbowColor=FALSE;
            }
        }
    }
    
    for(int i=SQUARREL_TRAIL_LENGTH-1;i>0;i--) {
        trailPoints[i].x=trailPoints[i-1].x;
        trailPoints[i].y=trailPoints[i-1].y;
        trailPoints[i].z=trailPoints[i-1].z;
        if(stop || stopDemo) {return;}
    }
    trailPoints[0].x=pixel.x;
    trailPoints[0].y=pixel.y;
    trailPoints[0].z=pixel.z;
    switch(axis) {
        case(0):
            pixel.x=position.x;
            pixel.y=position.y;
            pixel.z=position.z;
            break;
        case(1):
            pixel.x=position.z;
            pixel.y=position.x;
            pixel.z=position.y;
            break;
        case(2):
            pixel.x=position.y;
            pixel.y=position.z;
            pixel.z=position.x;
            break;
        case(3):
            pixel.x=position.z;
            pixel.y=SIDE-1-position.x;
            pixel.z=position.y;
            break;
        case(4):
            pixel.x=position.y;
            pixel.y=position.z;
            pixel.z=SIDE-1-position.x;
            break;
        case(5):
            pixel.x=position.x;
            pixel.y=SIDE-1-position.y;
            pixel.z=position.z;
            break;
    }
        
    voxelColor=getColorFromInteger(colorMap(frame%1000,0,1000));
    setPixelColor((int)pixel.x, (int)pixel.y, (int)pixel.z, voxelColor);
    for(int i=0;i<SQUARREL_TRAIL_LENGTH;i++) {
        Color trailColor;
        if(rainbowColor) {
            trailColor=getColorFromInteger(colorMap((frame+(i*1000/SQUARREL_TRAIL_LENGTH))%1000,0,1000));
            // La luminosité décroît linéairement jusqu'à la fin de la traînée.
            trailColor.red=trailColor.red*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
            trailColor.green=trailColor.green*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
            trailColor.blue=trailColor.blue*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
        }
        else {
            trailColor.red=voxelColor.red*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
            trailColor.green=voxelColor.green*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
            trailColor.blue=voxelColor.blue*(SQUARREL_TRAIL_LENGTH-i)/SQUARREL_TRAIL_LENGTH;
        }
        if(stop || stopDemo) {return;}
        setPixelColor((int)trailPoints[i].x, (int)trailPoints[i].y, (int)trailPoints[i].z, trailColor);
    }
    frame++;
    if(stop || stopDemo) {return;}
    showPixels();
    delay(speed * .5);
}

// ----------------------------------------------------------------------------
// Applique un incrément signé à une position Squarrel compacte.
//
// Parametres :
// - position : position logique à modifier.
// - increment : déplacement signé de chaque axe.
//
// Effet de bord :
// - modifie les trois coordonnées de position, garanties dans le cube par le cycle.
// ----------------------------------------------------------------------------
void add(SquarrelPosition& position, const SquarrelIncrement& increment) {
    position.x+=increment.x;
    position.y+=increment.y;
    position.z+=increment.z;
}

#include "plasma.cpp"

#endif
