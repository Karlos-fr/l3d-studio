// ============================================================================
// MovingSphere - Animation pilote du streaming web
// ----------------------------------------------------------------------------
// Ce module anime une sphere voxelisee rigide, gere ses rebonds dans le cube et
// fait tourner un motif colore attache a son volume. Il ne connait pas le LAN.
// ============================================================================

import type { StreamingAnimation } from "../animation";
import type { StreamingFramebuffer } from "../framebuffer";
import { clearFramebuffer } from "../primitives";

// Nombre de translations par defaut, aligne sur la cadence LAN recommandee.
const MOVING_SPHERE_DEFAULT_STEPS_PER_SECOND = 10;
// Vitesse minimale exposee par l'interface.
const MOVING_SPHERE_MIN_STEPS_PER_SECOND = 1;
// Vitesse maximale exposee par l'interface.
const MOVING_SPHERE_MAX_STEPS_PER_SECOND = 30;
// Rayon entier produisant une sphere pleine de 33 voxels, jamais tronquee.
const MOVING_SPHERE_RADIUS = 2;
// Plus petite coordonnee possible du centre sans tronquer la sphere.
const MOVING_SPHERE_MIN_CENTER = MOVING_SPHERE_RADIUS;
// Plus grande coordonnee possible du centre sans tronquer la sphere.
const MOVING_SPHERE_MAX_CENTER = 7 - MOVING_SPHERE_RADIUS;
// Vitesse angulaire du motif autour de l'axe vertical, en radians par seconde.
const MOVING_SPHERE_YAW_SPEED = 2.4;
// Vitesse angulaire du motif autour d'un second axe, en radians par seconde.
const MOVING_SPHERE_PITCH_SPEED = 1.35;
// Vitesse du glissement continu de la teinte, en tours chromatiques par seconde.
const MOVING_SPHERE_HUE_SPEED = 0.12;
// Facteur entier utilise par le generateur pseudo-aleatoire xorshift32.
const RANDOM_UINT32_SCALE = 4_294_967_296;

// Position entiere du centre de la sphere.
interface SphereCenter { x: number; y: number; z: number }
// Direction discrete appliquee a chaque translation.
interface SphereVelocity { x: number; y: number; z: number }
// Triplet RGB calcule sans exposer la representation du framebuffer.
interface SphereColor { red: number; green: number; blue: number }

// Animation pilote avec etat de mouvement, rotation et hasard local.
export class MovingSphereAnimation implements StreamingAnimation {
  private stepsPerSecond = MOVING_SPHERE_DEFAULT_STEPS_PER_SECOND;
  private pendingSteps = 0;
  private previousElapsedSeconds = 0;
  private center: SphereCenter = { x: 3, y: 3, z: 3 };
  private velocity: SphereVelocity = { x: 1, y: 1, z: 0 };
  private randomState: number;

  // --------------------------------------------------------------------------
  // Cree une animation avec une graine optionnelle pour rendre les tests stables.
  //
  // Parametres :
  // - randomSeed : graine forcee, ou horodatage melange a un alea du navigateur.
  // --------------------------------------------------------------------------
  constructor(randomSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) {
    this.randomState = randomSeed || 0x6d2b79f5;
  }

  // --------------------------------------------------------------------------
  // Modifie la vitesse des prochaines frames sans reinitialiser la trajectoire.
  //
  // Parametres :
  // - stepsPerSecond : nombre de translations entieres demandees par seconde.
  // --------------------------------------------------------------------------
  setStepsPerSecond(stepsPerSecond: number): void {
    this.stepsPerSecond = Math.max(
      MOVING_SPHERE_MIN_STEPS_PER_SECOND,
      Math.min(MOVING_SPHERE_MAX_STEPS_PER_SECOND, Math.round(stepsPerSecond)),
    );
  }

  // --------------------------------------------------------------------------
  // Initialise une nouvelle trajectoire et efface le framebuffer.
  //
  // Parametres :
  // - framebuffer : destination logique de l'animation.
  //
  // Effet de bord :
  // - poursuit la sequence aleatoire afin que deux demarrages ne se ressemblent pas.
  // --------------------------------------------------------------------------
  init(framebuffer: StreamingFramebuffer): void {
    this.pendingSteps = 0;
    this.previousElapsedSeconds = 0;
    this.center.x = this.randomCenterCoordinate();
    this.center.y = this.randomCenterCoordinate();
    this.center.z = this.randomCenterCoordinate();
    this.chooseInitialVelocity();
    clearFramebuffer(framebuffer);
  }

  // --------------------------------------------------------------------------
  // Translate la sphere, puis dessine son motif colore en rotation.
  //
  // Parametres :
  // - framebuffer : destination logique de la frame.
  // - elapsedSeconds : temps ecoule depuis le demarrage.
  // --------------------------------------------------------------------------
  frame(framebuffer: StreamingFramebuffer, elapsedSeconds: number): void {
    const elapsedDelta = Math.max(0, elapsedSeconds - this.previousElapsedSeconds);
    this.pendingSteps += elapsedDelta * this.stepsPerSecond;
    this.previousElapsedSeconds = elapsedSeconds;
    while (this.pendingSteps >= 1) {
      this.advanceOneStep();
      this.pendingSteps -= 1;
    }
    this.drawRotatingSphere(framebuffer, elapsedSeconds);
  }

  // --------------------------------------------------------------------------
  // Produit la prochaine valeur pseudo-aleatoire locale entre zero inclus et un exclu.
  //
  // Retour :
  // - valeur issue d'un xorshift32 sans dependance globale apres la construction.
  //
  // Effet de bord :
  // - avance l'etat pseudo-aleatoire prive de l'animation.
  // --------------------------------------------------------------------------
  private nextRandom(): number {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / RANDOM_UINT32_SCALE;
  }

  // --------------------------------------------------------------------------
  // Tire une coordonnee de centre compatible avec le rayon de la sphere.
  //
  // Retour :
  // - entier compris entre deux et cinq.
  // --------------------------------------------------------------------------
  private randomCenterCoordinate(): number {
    const coordinateCount = MOVING_SPHERE_MAX_CENTER - MOVING_SPHERE_MIN_CENTER + 1;
    return MOVING_SPHERE_MIN_CENTER + Math.floor(this.nextRandom() * coordinateCount);
  }

  // --------------------------------------------------------------------------
  // Tire une composante de direction parmi moins un, zero et un.
  //
  // Retour :
  // - composante discrete equiprobable.
  // --------------------------------------------------------------------------
  private randomVelocityComponent(): number {
    return Math.floor(this.nextRandom() * 3) - 1;
  }

  // --------------------------------------------------------------------------
  // Choisit une direction initiale non nulle propre a la nouvelle session.
  //
  // Effet de bord :
  // - remplace les trois composantes de vitesse.
  // --------------------------------------------------------------------------
  private chooseInitialVelocity(): void {
    do {
      this.velocity.x = this.randomVelocityComponent();
      this.velocity.y = this.randomVelocityComponent();
      this.velocity.z = this.randomVelocityComponent();
    } while (this.velocity.x === 0 && this.velocity.y === 0 && this.velocity.z === 0);
  }

  // --------------------------------------------------------------------------
  // Avance d'une position et varie les composantes tangentielles lors d'un choc.
  //
  // Effet de bord :
  // - modifie le centre et la direction sans jamais sortir la sphere du cube.
  // --------------------------------------------------------------------------
  private advanceOneStep(): void {
    const hitX = this.wouldLeaveCube(this.center.x, this.velocity.x);
    const hitY = this.wouldLeaveCube(this.center.y, this.velocity.y);
    const hitZ = this.wouldLeaveCube(this.center.z, this.velocity.z);
    if (hitX || hitY || hitZ) {
      this.velocity.x = hitX ? -this.velocity.x : this.randomAllowedVelocity(this.center.x);
      this.velocity.y = hitY ? -this.velocity.y : this.randomAllowedVelocity(this.center.y);
      this.velocity.z = hitZ ? -this.velocity.z : this.randomAllowedVelocity(this.center.z);
    }
    this.center.x += this.velocity.x;
    this.center.y += this.velocity.y;
    this.center.z += this.velocity.z;
  }

  // --------------------------------------------------------------------------
  // Indique si une composante de mouvement franchirait une paroi.
  //
  // Parametres :
  // - coordinate : coordonnee courante du centre.
  // - velocity : deplacement entier envisage.
  //
  // Retour :
  // - vrai lorsque la prochaine coordonnee depasse les centres autorises.
  // --------------------------------------------------------------------------
  private wouldLeaveCube(coordinate: number, velocity: number): boolean {
    const nextCoordinate = coordinate + velocity;
    return nextCoordinate < MOVING_SPHERE_MIN_CENTER || nextCoordinate > MOVING_SPHERE_MAX_CENTER;
  }

  // --------------------------------------------------------------------------
  // Tire une direction tangentielle qui reste compatible avec une autre paroi.
  //
  // Parametres :
  // - coordinate : coordonnee courante eventuellement posee sur une limite.
  //
  // Retour :
  // - composante aleatoire qui ne peut pas faire sortir le centre du cube.
  // --------------------------------------------------------------------------
  private randomAllowedVelocity(coordinate: number): number {
    if (coordinate === MOVING_SPHERE_MIN_CENTER) return Math.floor(this.nextRandom() * 2);
    if (coordinate === MOVING_SPHERE_MAX_CENTER) return -Math.floor(this.nextRandom() * 2);
    return this.randomVelocityComponent();
  }

  // --------------------------------------------------------------------------
  // Dessine les 33 voxels d'un motif dont l'orientation et la teinte evoluent.
  //
  // Parametres :
  // - framebuffer : destination logique effacee puis remplie.
  // - elapsedSeconds : horloge continue utilisee par la rotation et la couleur.
  // --------------------------------------------------------------------------
  private drawRotatingSphere(framebuffer: StreamingFramebuffer, elapsedSeconds: number): void {
    clearFramebuffer(framebuffer);
    const yaw = elapsedSeconds * MOVING_SPHERE_YAW_SPEED;
    const pitch = elapsedSeconds * MOVING_SPHERE_PITCH_SPEED;
    const cosineYaw = Math.cos(yaw);
    const sineYaw = Math.sin(yaw);
    const cosinePitch = Math.cos(pitch);
    const sinePitch = Math.sin(pitch);
    for (let localZ = -MOVING_SPHERE_RADIUS; localZ <= MOVING_SPHERE_RADIUS; localZ += 1) {
      for (let localY = -MOVING_SPHERE_RADIUS; localY <= MOVING_SPHERE_RADIUS; localY += 1) {
        for (let localX = -MOVING_SPHERE_RADIUS; localX <= MOVING_SPHERE_RADIUS; localX += 1) {
          if (localX * localX + localY * localY + localZ * localZ > MOVING_SPHERE_RADIUS ** 2) continue;
          const yawX = cosineYaw * localX + sineYaw * localZ;
          const yawZ = -sineYaw * localX + cosineYaw * localZ;
          const rotatedY = cosinePitch * localY + sinePitch * yawZ;
          const rotatedZ = -sinePitch * localY + cosinePitch * yawZ;
          const color = this.colorForRotatedVoxel(yawX, rotatedY, rotatedZ, elapsedSeconds);
          framebuffer.setVoxel(
            this.center.x + localX,
            this.center.y + localY,
            this.center.z + localZ,
            color.red,
            color.green,
            color.blue,
          );
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Calcule la couleur d'un point du motif dans le repere tournant de la sphere.
  //
  // Parametres :
  // - rotatedX, rotatedY, rotatedZ : coordonnees apres rotation inverse du motif.
  // - elapsedSeconds : horloge qui fait glisser la palette sans discontinuite.
  //
  // Retour :
  // - couleur RGB vive dont les bandes restent attachees a la sphere.
  // --------------------------------------------------------------------------
  private colorForRotatedVoxel(
    rotatedX: number,
    rotatedY: number,
    rotatedZ: number,
    elapsedSeconds: number,
  ): SphereColor {
    const longitude = Math.atan2(rotatedZ, rotatedX) / (Math.PI * 2);
    const latitudeBand = rotatedY * 0.11;
    const hue = longitude + latitudeBand + elapsedSeconds * MOVING_SPHERE_HUE_SPEED;
    return hueToRgb(hue - Math.floor(hue));
  }
}

// ----------------------------------------------------------------------------
// Convertit une teinte cyclique en couleur RGB vive et continue.
//
// Parametres :
// - hue : position normalisee entre zero et un dans le cercle chromatique.
//
// Retour :
// - couleur RGB a saturation et luminosite constantes.
// ----------------------------------------------------------------------------
function hueToRgb(hue: number): SphereColor {
  const sector = hue * 6;
  const chroma = 224;
  const secondary = Math.round(chroma * (1 - Math.abs((sector % 2) - 1)));
  const minimum = 24;
  const maximum = minimum + chroma;
  switch (Math.floor(sector) % 6) {
    case 0: return { red: maximum, green: minimum + secondary, blue: minimum };
    case 1: return { red: minimum + secondary, green: maximum, blue: minimum };
    case 2: return { red: minimum, green: maximum, blue: minimum + secondary };
    case 3: return { red: minimum, green: minimum + secondary, blue: maximum };
    case 4: return { red: minimum + secondary, green: minimum, blue: maximum };
    default: return { red: maximum, green: minimum, blue: minimum + secondary };
  }
}
