#ifdef L3D_UNITY_BUILD

void cheerlights(void) {
    int red, green, blue;
    bool headers;
    char lastChar;
    run = TRUE;
    
    if((millis()-pollTime)<=POLLING_INTERVAL) {
		if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
	    if(!Particle.connected()) {
	        Particle.connect();
	        connected = waitFor(Particle.connected, 1500);
	        if(connected) {
    		    client.stop();
    		    client.connect(hostname, 80);
    		    connected = waitFor(client.connected, 1500);
	        }
	    }
        else if(!client.connected()) {
		    client.stop();
		    client.connect(hostname, 80);
		    connected = waitFor(client.connected, 1500);
        }
	    else {
            //In order to allow changing the brightness at any moment
            strip.setBrightness(brightness);
            strip.show();
            //process Spark events
            Particle.process();
            delay(100);
	    }
    }
    else {
        connected = client.connected();
        if(connected) {
            pollTime=millis();
            client.print("GET ");
            client.print(path);
            client.println(" HTTP/1.0");
            client.print("Host: ");
            client.println(hostname);
            client.println("Content-Length: 0");
            client.println();
          	// DEBUG
            sprintf(debug, "connected");
        }
        else {
          	// DEBUG
            sprintf(debug, "not connected");
			
			if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
            client.stop();
		    response = "";
		    if(!Particle.connected()) {
		        Particle.connect();
		        connected = waitFor(Particle.connected, 1500);
		        if(connected) {
    		        client.stop();
        		    client.connect(hostname, 80);
        		    connected = waitFor(client.connected, 1500);
		        }
		    }
		    else {
		        client.stop();
    		    client.connect(hostname, 80);
    		    connected = waitFor(client.connected, 1500);
		    }
        }
    
        requestTime=millis();
        while((client.available()==0)&&((millis()-requestTime)<RESPONSE_TIMEOUT)) {
			if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
            Particle.process();    //process Spark events
        };
        
        headers=TRUE;
        lastChar='\n';
        response="";
    	while(client.available()>0) {
			if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
    		char thisChar=client.read();
    		if(!headers)
    		    response.concat(String(thisChar));
    		else {
    			if((thisChar=='\r')&&(lastChar=='\n')) {
        			headers=FALSE;
        			client.read();  //kill that last \n
    			}
    			lastChar=thisChar;  
    		}
          	// DEBUG
            itoa(client.available(), debug, 10);
    	}

        //if there's a valid hex color string from Cheerlights, update the color
        if(response.length()==7) {
            //convert the hex values from the response.body string into byte values
    		red=hexToInt(response.charAt(1))*16+hexToInt(response.charAt(2));
    		green=hexToInt(response.charAt(3))*16+hexToInt(response.charAt(4));
    		blue=hexToInt(response.charAt(5))*16+hexToInt(response.charAt(6));
        	Color col=Color(red, green, blue);

        	//actually update the color on the cube, with a cute animation
    	    if(col != lastCol) {
            	lastCol = col;
	            int c = strip.Color(col.red, col.green, col.blue);
        	    int which = random(0, 6);
                if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
        	    switch(which) {
        	        case 0:
        	            transitionAll(col, POLAR);
        	            break;
        	        case 1:
        	            switch2 = switch3 = FALSE;
        	            colorZone(c, c, c, c, run);
        	            break;
        	        case 2:
        	            fillX(col);
        	            break;
        	        case 3:
        	            fillY(col);
        	            break;
        	        case 4:
        	            fillZ(col);
        	            break;
        	        case 5:
        	        default:
        	            switch1 = switch1 = FALSE;
        	            switch3 = random(2);
        	            randomPixelFill(c);
        	            break;
        	    }
    	    }
          	// DEBUG
            sprintf(debug, response);
        }
        else {
          	// DEBUG
            sprintf(debug, "no reply from host");
            if(stop || stopDemo) {demo = FALSE; client.stop(); return;}
            client.stop();
		    response = "";
		    if(!Particle.connected()) {
		        Particle.connect();
		        connected = waitFor(Particle.connected, 1500);
		        if(connected) {
    		        client.stop();
        		    client.connect(hostname, 80);
        		    connected = waitFor(client.connected, 1500);
		        }
		    }
		    else {
		        client.stop();
    		    client.connect(hostname, 80);
    		    connected = waitFor(client.connected, 1500);
		    }
        }
    }
}

// Attempt to use a separate thread to get cheerlights 
/*os_thread_return_t LoopgetCheerLightsColor(void* param){
    bool shouldIGetCheerLights;
    resetVariables(CHEERLIGHTS);   //initCheerLights();
    for(;;) {
        shouldIGetCheerLights = ((currentModeID == getModeIndexFromID(CUBE_CLASSICS)) && switch2);
        if(shouldIGetCheerLights) {getCheerlights();}
    }
}*/

/*void initCheerLights(void) {
    hostname = "api.thingspeak.com";
    path = "/channels/1417/field/2/last.txt";
	response = "";
	pollTime = millis() + POLLING_INTERVAL;
	lastCol = black;
    client.stop();
	connected = client.connect(hostname, 80);
}*/

/*void getCheerlights(void) {
    int red, green, blue;
    bool headers;
    char lastChar;
    run = TRUE;
    
    if((millis()-pollTime)<=POLLING_INTERVAL) {
        //In order to allow changing the brightness at any moment
        strip.setBrightness(brightness);
        strip.show();
        //process Spark events
        Particle.process();
        delay(100);
    }
    else {
        if(connected) {
            pollTime=millis();
            client.print("GET ");
            client.print(path);
            client.println(" HTTP/1.0");
            client.print("Host: ");
            client.println(hostname);
            client.println("Content-Length: 0");
            client.println();
            sprintf(debug, "connected");
        }
        else {
            sprintf(debug, "not connected");
          
            client.stop();
		    response = "";
		    if(Particle.connected)
			connected = client.connect(hostname, 80);
        }
    
        requestTime=millis();
        while((client.available()==0)&&((millis()-requestTime)<RESPONSE_TIMEOUT)) {
            Particle.process();    //process Spark events
        };
        
        headers=TRUE;
        lastChar='\n';
        response="";
    	while(client.available()>0) {
    		char thisChar=client.read();
    		if(!headers)
    		    response.concat(String(thisChar));
    		else {
    			if((thisChar=='\r')&&(lastChar=='\n')) {
        			headers=FALSE;
        			client.read();  //kill that last \n
    			}
    			lastChar=thisChar;  
    		}
            itoa(client.available(), debug, 10);
    	}

        //if there's a valid hex color string from Cheerlights, update the color
        if(response.length()==7) {
            //convert the hex values from the response.body string into byte values
    		red=hexToInt(response.charAt(1))*16+hexToInt(response.charAt(2));
    		green=hexToInt(response.charAt(3))*16+hexToInt(response.charAt(4));
    		blue=hexToInt(response.charAt(5))*16+hexToInt(response.charAt(6));
        	cheerLightsColor = Color(red, green, blue);
        }
        else {
            sprintf(debug, "no reply from host");
          	
            client.stop();
		    response = "";
		    if(Particle.connected) 
		       connected = client.connect(hostname, 80);
        }
    }
}*/

#endif
