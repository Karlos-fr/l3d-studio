#pragma once

void color_fade();
void flicker(uint32_t c);
void pulse_oneColorAll(uint32_t color1);
void police_light_strobo();
void twoColorChaser(uint32_t color1, uint32_t color2);
void colorPulse();
void cycleLerp();
void colorStripes();
void rainbow(void);
void rainbowCycle(void);
void random_burst();
void theaterChaseRainbow(void);
void frozen(void);
void findRandomSnowFlakesPositions(int numFlakes);
void collide(void);
uint32_t Wheel(byte WheelPos, float opacity);
uint32_t lerpColor(uint32_t c1, uint32_t c2, uint32_t val, uint32_t minVal, uint32_t maxVal);
uint32_t colorMap(float val, float minVal, float maxVal);
void mixVoxel(Point currentPoint, Color col);
Color fadeColor(Color col, float scaleFactor);
void fadeSmooth(char lowerLim, char upperLim, float scaleFactor);
Color complement(Color original);
void drawSolidHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col);
void drawHollowHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col, bool rndColor);
