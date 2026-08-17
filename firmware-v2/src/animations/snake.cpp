#ifdef L3D_UNITY_BUILD

void snake() {
  Color segmentColor;
  SNframeCount++;

  if (!deathFrame) {
    moveSnake();
  } else {
    if (SNframeCount - deathFrame > 48) {
      snakeResetCube();
		}
	}
    background(black);
	for(auto it = SNsnake.begin(); it != SNsnake.end(); ++it) {
    if (deathFrame && SNframeCount % 16 < 8) {
		segmentColor = Color(255, 255, 255);
    } else if (deathFrame > 0) {
		segmentColor = Color(255, 0, 0);
    } else {
		segmentColor = Color((it->j+1)*255/8, (it->k+1)*255/8, (it->l+1)*255/8);
    }
    setPixelColor(it->j, it->k, it->l, segmentColor);
  }
  if (!deathFrame) {
    for(auto it = treats.begin(); it != treats.end(); ++it) {
      setPixelColor(it->j, it->k, it->l, Color(150, 255, 0));
    }
  }
  
  if(stop || stopDemo) {return;}
  showPixels();
  delay(speed);	
  run = TRUE;
}

void moveSnake() {
  updateDirection();
  if (snakeDirection == NULL) {
    deathFrame = SNframeCount;
    return;
  }
  bool grow = (SNsnake.size() < initialSnakeLength);
  voxel front = SNsnake[0] + *snakeDirection;
  for(auto it = treats.begin(); it != treats.end(); ++it) {
    if (*it == front) {
      treats.erase(it);
      grow = true;
      break;
    }
  }
  SNsnake.insert(SNsnake.begin(), front);
  if(!grow) {
    SNsnake.pop_back();
  } 
  if (!treats.size()) {
    addTreat();
  }
}

bool containsVoxel(std::vector<voxel> &vectorList, voxel &voxel) {
  for (auto it = vectorList.begin(); it != vectorList.end(); ++it) {
    if (*it == voxel) {
      return true;
    }
  }
  return false;
}

bool canMove(struct voxel* direction)  {
  voxel next = SNsnake[0] + *direction;
  return (next.j >= 0 && next.k >= 0 && next.l >= 0 && next.j <= 7 && next.k <= 7 && next.l <= 7 && !containsVoxel(SNsnake, next));
}

void addTreat() {
  voxel treat;
  while (true) {
    treat = { random(0, 7), random(0, 7), random(0, 7) };
    if (containsVoxel(SNsnake, treat) || containsVoxel(treats, treat)) {
      continue;
    } else {
      treats.push_back(treat);
      break;
    }
  }
}

void updateDirection() {
  if (canMove(snakeDirection) && random(0, 100) < 80) {
    return;
  }
  std::vector<voxel*> allowedDirections;
  for(auto it = possibleDirections.begin(); it != possibleDirections.end(); ++it) {
    if (canMove(&(*it))) {
      allowedDirections.push_back(&(*it));
    }
  }
  if (allowedDirections.size() == 0) {
    snakeDirection = NULL;
    return;
  }
  double leastDistance = 65536.0;
  double SNdistance;
  voxel next;
  for(auto it = allowedDirections.begin(); it != allowedDirections.end(); ++it) {
    next = SNsnake[0] + **it;
    SNdistance = next.distance(treats[0]);
    if (SNdistance < leastDistance) {
      leastDistance = SNdistance;
      snakeDirection = *it;
    }
  }
}

void snakeResetCube() {
    background(black);
	snakeDirection = &possibleDirections[0];
	initialSnakeLength = 10;
	SNsnake.clear();
	SNsnake.emplace_back(0, 0, 0);
	deathFrame = 0;
	SNframeCount = 0;
	treats.clear();
	addTreat();
}


/* ======================== clasic planes mode routines ======================== */

#endif
