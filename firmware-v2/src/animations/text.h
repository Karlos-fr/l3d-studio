#pragma once

void showText(uint32_t color1, uint32_t color2);
void textScroll(uint32_t color1, uint32_t color2);
void textMarquee(uint32_t color1, uint32_t color2);
void showChar(char a, Point p, Color col);
void showChar(char a, Point origin, Point angle, Color col);
void showChar(char a, Point origin, Point pivot, Point angle, Color col);
void scrollText(String text, Point initialPosition, Color col);
void marquee(String text, float pos, Color col);
void showMarqueeChar(char a, int pos, Color col);
