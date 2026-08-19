// ============================================================================
// MovingSphereTests - Validation de l'animation sphere diffusee par le web
// ----------------------------------------------------------------------------
// Ces tests verifient le volume, la rotation coloree et la variabilite des
// trajectoires sans solliciter le transport LAN.
// ============================================================================

import { describe, expect, it } from "vitest";
import { StreamingFramebuffer } from "../framebuffer";
import { MovingSphereAnimation } from "./moving_sphere";

// Nombre de voxels occupes par la sphere de rayon deux.
const EXPECTED_SPHERE_VOXELS = 33;

// --------------------------------------------------------------------------
// Retourne les coordonnees allumees sous une forme comparable et stable.
//
// Parametres :
// - framebuffer : image logique a parcourir.
//
// Retour :
// - liste ordonnee des coordonnees non noires.
// --------------------------------------------------------------------------
function getLitVoxels(framebuffer: StreamingFramebuffer): string[] {
  const coordinates: string[] = [];
  for (let z = 0; z < 8; z += 1) {
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const [red, green, blue] = framebuffer.getVoxel(x, y, z);
        if (red !== 0 || green !== 0 || blue !== 0) coordinates.push(`${x},${y},${z}`);
      }
    }
  }
  return coordinates;
}

// --------------------------------------------------------------------------
// Retourne une signature complete des couleurs du framebuffer.
//
// Parametres :
// - framebuffer : image logique dont les composantes sont copiees.
//
// Retour :
// - chaine stable adaptee aux comparaisons de tests.
// --------------------------------------------------------------------------
function getColorSignature(framebuffer: StreamingFramebuffer): string {
  return Array.from(framebuffer.colors).join(",");
}

// --------------------------------------------------------------------------
// Calcule le centre entier d'un volume symetrique a partir de ses voxels.
//
// Parametres :
// - framebuffer : image contenant une sphere complete.
//
// Retour :
// - coordonnees du barycentre, concatenees pour suivre une trajectoire.
// --------------------------------------------------------------------------
function getCenterSignature(framebuffer: StreamingFramebuffer): string {
  const coordinates = getLitVoxels(framebuffer).map((coordinate) => coordinate.split(",").map(Number));
  const sums = coordinates.reduce(
    (total, [x = 0, y = 0, z = 0]) => [total[0] + x, total[1] + y, total[2] + z],
    [0, 0, 0],
  );
  return sums.map((sum) => Math.round(sum / coordinates.length)).join(",");
}

describe("MovingSphereAnimation", () => {
  it("conserve une sphere complete de 33 voxels pendant ses translations", () => {
    const animation = new MovingSphereAnimation(1234);
    const framebuffer = new StreamingFramebuffer();
    animation.init(framebuffer);
    for (let frameIndex = 0; frameIndex < 30; frameIndex += 1) {
      animation.frame(framebuffer, frameIndex / 10);
      expect(getLitVoxels(framebuffer)).toHaveLength(EXPECTED_SPHERE_VOXELS);
    }
  });

  it("fait tourner et evoluer les couleurs avant la prochaine translation", () => {
    const animation = new MovingSphereAnimation(5678);
    const framebuffer = new StreamingFramebuffer();
    animation.setStepsPerSecond(1);
    animation.init(framebuffer);
    animation.frame(framebuffer, 0);
    const initialCenter = getCenterSignature(framebuffer);
    const initialColors = getColorSignature(framebuffer);
    animation.frame(framebuffer, 0.2);
    expect(getCenterSignature(framebuffer)).toBe(initialCenter);
    expect(getColorSignature(framebuffer)).not.toBe(initialColors);
  });

  it("produit des trajectoires distinctes avec des graines distinctes", () => {
    const firstAnimation = new MovingSphereAnimation(1111);
    const secondAnimation = new MovingSphereAnimation(2222);
    const firstFramebuffer = new StreamingFramebuffer();
    const secondFramebuffer = new StreamingFramebuffer();
    firstAnimation.init(firstFramebuffer);
    secondAnimation.init(secondFramebuffer);
    const firstCenters: string[] = [];
    const secondCenters: string[] = [];
    for (let frameIndex = 0; frameIndex < 40; frameIndex += 1) {
      firstAnimation.frame(firstFramebuffer, frameIndex / 10);
      secondAnimation.frame(secondFramebuffer, frameIndex / 10);
      firstCenters.push(getCenterSignature(firstFramebuffer));
      secondCenters.push(getCenterSignature(secondFramebuffer));
    }
    expect(firstCenters).not.toEqual(secondCenters);
  });

  it("change de vitesse sans replacer brutalement la sphere", () => {
    const animation = new MovingSphereAnimation(9876);
    const framebuffer = new StreamingFramebuffer();
    animation.init(framebuffer);
    animation.frame(framebuffer, 0);
    animation.frame(framebuffer, 0.1);
    const centerBeforeSpeedChange = getCenterSignature(framebuffer);
    animation.setStepsPerSecond(1);
    animation.frame(framebuffer, 0.2);
    expect(getCenterSignature(framebuffer)).toBe(centerBeforeSpeedChange);
  });
});
