#pragma once

void snake();
void moveSnake();
bool containsVoxel(std::vector<voxel> &vectorList, voxel &voxel);
bool canMove(struct voxel* direction);
void addTreat();
void updateDirection();
void snakeResetCube();
