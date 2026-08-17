#ifdef L3D_UNITY_BUILD

void dSpiral_setup() {
    TARGET=TARGET+STEPS;
	SPbrightness = brightness;
    //cube.background(black);
	background(black);
}

void dSpiral() {
    ColourRotatorState++;
  	if(ColourRotatorState>30){
    	ColourRotatorState=0;
    }
	// Start drawing!!
    for(int z = SIDE; z >= 0; z--) {
        for(int col = 0; col <= SIDE; col++) {
            for(int row = SIDE; row >= 0; row--) {
                //Color oldColour = cube.getVoxel(col,row,z);
				Color oldColour = getPixelColor(col,row,z);
                int R=0;
                int G=0;
                int B=0;
                int lucky_no = random(0,64);
			//Funky fade
                int red_reduction = 0;
                if(oldColour.red == SPbrightness){
                    if(lucky_no>=0){
                        red_reduction = 15;
               		    if(ColourRotatorState>=0&&ColourRotatorState<=5){
                        	red_reduction=red_reduction-ColourRotatorState;
                        }
                        if(ColourRotatorState>5&&ColourRotatorState<10){
                        	red_reduction=(red_reduction-5)+(ColourRotatorState-5);
                        }
                    }else{
                        red_reduction = 1;
                    }
                }else{
                    red_reduction = (1+random(0,1));
                }
                int green_reduction = 0;
                if(oldColour.green == SPbrightness){
                    if(lucky_no>=0){
                        green_reduction = 15;
                        if(ColourRotatorState>=10&&ColourRotatorState<=15){
                        	green_reduction=green_reduction-(ColourRotatorState-10);
                        }
                        if(ColourRotatorState>15&&ColourRotatorState<20){
                        	green_reduction=(green_reduction-5)+(ColourRotatorState-15);
                        }
                    }else{
                        green_reduction = 1;
                    }
                }else{
                    green_reduction = (1+random(0,1));
                }
                int blue_reduction=0;
                if(oldColour.blue == SPbrightness){
                    if(lucky_no>=0){
                        blue_reduction = 15;
                       if(ColourRotatorState>=20&&ColourRotatorState<=25){
                        	blue_reduction=blue_reduction-(ColourRotatorState-10);
                        }
                        if(ColourRotatorState>25&&ColourRotatorState<30){
                        	blue_reduction=(blue_reduction-5)+(ColourRotatorState-25);
                        }
                    }else{
                        blue_reduction = 1;
                    }
                }else{
                    blue_reduction = (1+random(0,1));
                }
                if(oldColour.red>0){
                    if(red_reduction>oldColour.red){
                        R=0;
                    }else{
                        R=oldColour.red-red_reduction;
                    }
                }
                if(oldColour.green>0){
                    if(green_reduction>oldColour.green){
                        G=0;
                    }else{
                        G=oldColour.green-green_reduction;
                    }
                }
                if(oldColour.blue>0){
                    if(blue_reduction>oldColour.blue){
                        B=0;
                    }else{
                        B=oldColour.blue-blue_reduction;
                    }
                }
                Color newColor = Color(R, G, B);
                if(DSSIDE==1){
                    if(z==(7-LOOP_NO)){
                        if((TARGET-1)<col&&(TARGET+1)>col){
                          newColor = Color(SPbrightness,SPbrightness,SPbrightness);
                        }
                    }
                }
                if(DSSIDE==2){
                    if(col==(7-LOOP_NO)){
                        if((TARGET-1)<z&&(TARGET+1)>z){
                          newColor = Color(SPbrightness,SPbrightness,SPbrightness);
                        }
                    }
                }
                if(DSSIDE==3){
                    if(z==(0+LOOP_NO)){
                        if((TARGET-1)<col&&(TARGET+1)>col){
                            newColor = Color(SPbrightness,SPbrightness,SPbrightness);
                        }
                    }
                }
                if(DSSIDE==4){
                    if(col==(0+LOOP_NO)){
                        if((TARGET-1)<z&&(TARGET+1)>z){
                          newColor = Color(SPbrightness,SPbrightness,SPbrightness);
                        }
                    }
                }
                setPixelColor(col, row, z, newColor);
            }
        }
    }
	
	//Detect if the end of a DSSIDE has been reached by the beam
    if(DSSIDE==1){
        if(TARGET==(7-LOOP_NO)){
            DSSIDE=2;
            INCREASE_TARGET=false;
            TARGET=7-LOOP_NO;
        }
    }else if(DSSIDE==2){
        if(TARGET==(0+LOOP_NO)){
            INCREASE_TARGET=false;
            DSSIDE=3;
            TARGET=7-LOOP_NO;
        }
    }else if(DSSIDE==3){
        if(TARGET==(0+LOOP_NO)){
            INCREASE_TARGET=true;
            DSSIDE=4;
            TARGET=0+LOOP_NO;
        }
    }else if(DSSIDE==4){
        if(TARGET==(7-LOOP_NO)){
            INCREASE_TARGET=true;
            DSSIDE=1;
            TARGET=0+LOOP_NO;
            if(LOOP_NO==3&&INCREASE_LOOP==true){
                INCREASE_LOOP=false;
            }else if(LOOP_NO==0&&INCREASE_LOOP==false){
                INCREASE_LOOP=true;
            }
            if(INCREASE_LOOP){
                LOOP_NO++;
            }else{
                LOOP_NO--;
            }
        }
    }
	
    //Move the beam target in the direction which has been set
    if(INCREASE_TARGET){
        TARGET=TARGET+STEPS;
    }else{
        TARGET=TARGET-STEPS;
    }
	
	if(stop || stopDemo) {return;}
	showPixels();
	delay(speed);
	run = TRUE;
}

#include "hyper_disabled.cpp"

/* ======================== MATRIX mode routines ============================== */

#endif
