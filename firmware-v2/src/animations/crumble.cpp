#ifdef L3D_UNITY_BUILD

void crumble() {
	if( shift() )
		return;
	pick = draw();
	Coffset = 0;
	
	if(stop || stopDemo) {return;}
	showPixels();
	delay(speed);
	run = TRUE;		
}

void setVoxel( int x, int y, int z, bool clear ) {
	if( Cmirror )
		z = 7-z;
	int t;  
	switch( CRaxis ){
		case 0: t = y;	y = z;	z = t;  break;
		case 1: t = x;	x = z;	z = t;  break;
		case 2: t = x;	x = y;	y = t;  break;
	}
	if( clear )
		setPixelColor( x, y, z, clearColor );
	else
		setPixelColor( x, y, z, mainColor );
}

bool shift() {
	int x = pick/8;
	int y = pick%8;

	setVoxel( x, y, Coffset, false );
	if( Coffset>0 )
		setVoxel( x, y, Coffset-1, true );
	return ++Coffset<8;
}

int draw() {
	int random = ( ( ( double )rand()/( RAND_MAX ) )*( remaining.size()-1 ) );
	int pick = remaining.at( random );
	remaining.erase( remaining.begin()+random );
	if( remaining.empty() )
		{
	    mainColor =  Color(rand()%255, rand()%255, rand()%255);			
		resetCycle();
		}
	return pick;
}

void resetCycle() {
	Cmirror = !Cmirror;
	if( ++flips>=NUM_FLIPS )
	{
		if( ++CRaxis>2 )
			CRaxis = 0;
		flips = 0;
	}
	for( int x=0; x<8; x++ )
		for( int y=0; y<8; y++ )
			for( int z=0; z<8; z++ )
				setVoxel( x, y, z, true );

	for( int i=0; i<64; i++ )
	{
		remaining.push_back( i );
		int x = i/8;
		int y = i%8;
		setVoxel( x, y, 0, false );
	}
}


/* ======================== Snake 3D mode routines ========================== */

#endif
