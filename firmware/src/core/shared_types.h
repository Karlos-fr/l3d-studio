// ============================================================================
// SharedTypes - Declaration des structures historiques partagees
// ----------------------------------------------------------------------------
// Ce fichier regroupe les types utilises par plusieurs animations. Les
// representations numeriques elementaires restent definies dans NumericTypes.
// ============================================================================

#pragma once

#include "numeric_types.h"

#define MAX_NUM_COLORS    6
#define MAX_NUM_SWITCHES  4

typedef struct modeParams {
   uint8_t	modeId;
   char	modeName[20];
   uint8_t	numOfColors;       //Tell the android app home many colors to expect. Max number is 6
   uint8_t  numOfSwitches;
   bool textInput;   
} modeParams;

typedef struct switchParams {
   uint8_t  modeId;
   char switch1Title[20];
   char switch2Title[20];
   char switch3Title[20];
   char switch4Title[20];
} switchParams;

typedef struct auxSwitchParams {
    uint8_t  auxSwitchId;
    bool auxSwitchState;
    char auxSwitchTitle[20];
    char auxSwitchOnName[20];
    char auxSwitchOffName[20];
} auxSwitchParams;

/** An RGB color. */
typedef struct Color {
  uint8_t red, green, blue;

  Color(int r, int g, int b) : red(r), green(g), blue(b) {}
  Color() : red(0), green(0), blue(0) {}
} Color;

/** A point in 3D space. */
typedef struct Point {
  GeometryScalar x;
  GeometryScalar y;
  GeometryScalar z;
  Point() : x(0), y(0), z(0) {}
  Point(GeometryScalar _x, GeometryScalar _y, GeometryScalar _z) : x(_x), y(_y), z(_z) {}
} Point;

/** Point entier compact reserve aux etats temporaires bornes des animations. */
typedef struct PackedPoint {
  CubeCoordinate x;
  CubeCoordinate y;
  CubeCoordinate z;
} PackedPoint;

/** Couleur RGB triviale réservée aux états placés dans une union. */
typedef struct PackedColor {
  uint8_t red;
  uint8_t green;
  uint8_t blue;
} PackedColor;

/** A 3D RGB voxel. */
typedef struct Voxel {
    Point coordinates;  // 12 Bytes
    Color color;        // 3 Bytes
    Voxel() : coordinates(), color() {}
} Voxel;

static_assert(sizeof(Color) == 3, "Color doit rester un triplet RGB compact");
static_assert(sizeof(Point) == 12, "Point doit contenir trois float 32 bits");
static_assert(sizeof(PackedPoint) == 3, "PackedPoint doit rester compact");
static_assert(sizeof(PackedColor) == 3, "PackedColor doit rester un triplet RGB");
static_assert(sizeof(Voxel) == 16, "Voxel ne doit pas gagner de padding supplementaire");

/** Overloaded != operator. */
bool operator!= (const Color& a, const Color& b) {
    if(a.red != b.red) return true;
    if(a.green != b.green) return true;
    if(a.blue != b.blue) return true;
    return false;
}

bool operator!= (const Point& a, const Point& b) {
    if(a.x != b.x) return true;
    if(a.y != b.y) return true;
    if(a.z != b.z) return true;
    return false;
}

/** Overloaded == operator. */
bool operator== (const Color& a, const Color& b) {
    if(a.red != b.red) return false;
    if(a.green != b.green) return false;
    if(a.blue != b.blue) return false;
    return true;
}

bool operator== (const Point& a, const Point& b) {
    if(a.x != b.x) return false;
    if(a.y != b.y) return false;
    if(a.z != b.z) return false;
    return true;
}

/** Common colors */
const Color black           = Color(0x00, 0x00, 0x00);
//const Color grey            = Color(0x92, 0x95, 0x91);
const Color yellow          = Color(0xff, 0xff, 0x14);
//const Color incandescent    = Color(0xfd, 0xf5, 0xe6);  //This seems closer to incandescent color
//const Color magenta         = Color(0xc2, 0x00, 0x78);  //#FF00FF
//const Color orange          = Color(0xf9, 0x73, 0x06);  //#FFA500
//const Color teal            = Color(0x02, 0x93, 0x86);
//const Color cyan            = Color(0x02, 0xff, 0xff);
const Color red             = Color(0xff, 0x00, 0x00);
//const Color brown           = Color(0x65, 0x37, 0x00);
//const Color pink            = Color(0xff, 0x81, 0xc0);
//const Color lightpink       = Color(0xff, 0xc0, 0xcb);
const Color blue            = Color(0x00, 0x00, 0xff);
const Color green           = Color(0x00, 0xff, 0x00);
//const Color purple          = Color(0x7e, 0x1e, 0x9c);  //#800080
const Color white           = Color(0xff, 0xff, 0xff);

