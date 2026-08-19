// ============================================================================
// StreamingRegistry - Catalogue leger des animations web
// ----------------------------------------------------------------------------
// Le registre isole les animations concretes du moteur et de l'interface. Une
// entree ajoute seulement un identifiant, un libelle et une fabrique locale.
// ============================================================================

import type { StreamingAnimation } from "./animation";
import {
  LIL_BIRB_EAT_CLIP,
  LIL_BIRB_FLIGHT_CLIP,
  LIL_BIRB_IDLE_CLIP,
  LIL_BIRB_LANDING_CLIP,
  LIL_BIRB_TAKE_OFF_CLIP,
} from "./assets/lil_birb";
import { MovingSphereAnimation } from "./animations/moving_sphere";
import { SpritePlayerAnimation } from "./sprites/sprite_player";

// Identifiant stable de l'animation proposee au premier chargement.
export const DEFAULT_STREAMING_ANIMATION_ID = "moving-sphere";

// Definition minimale affichee par le selecteur et instanciee par le moteur.
export interface StreamingAnimationDefinition {
  id: string;
  label: string;
  create: () => StreamingAnimation;
}

// Catalogue ferme courant ; ajouter une animation ne modifie pas le moteur.
const STREAMING_ANIMATIONS: readonly StreamingAnimationDefinition[] = [
  { id: DEFAULT_STREAMING_ANIMATION_ID, label: "Sphère rebondissante", create: createMovingSphere },
  { id: "lil-birb-idle", label: "Oiseau bleu — Repos", create: createLilBirbIdle },
  { id: "lil-birb-eat", label: "Oiseau bleu — Mange", create: createLilBirbEat },
  { id: "lil-birb-take-off", label: "Oiseau bleu — Décollage", create: createLilBirbTakeOff },
  { id: "lil-birb-flight", label: "Oiseau bleu — Vol", create: createLilBirbFlight },
  { id: "lil-birb-landing", label: "Oiseau bleu — Atterrissage", create: createLilBirbLanding },
];

// ----------------------------------------------------------------------------
// Cree une nouvelle sphere independante.
//
// Retour :
// - animation de demonstration par defaut.
// ----------------------------------------------------------------------------
function createMovingSphere(): StreamingAnimation {
  return new MovingSphereAnimation();
}

// ----------------------------------------------------------------------------
// Cree le lecteur de la sequence de repos Lil' Birb.
//
// Retour :
// - lecteur configure pour les trois images de repos.
// ----------------------------------------------------------------------------
function createLilBirbIdle(): StreamingAnimation {
  return new SpritePlayerAnimation(LIL_BIRB_IDLE_CLIP);
}

// ----------------------------------------------------------------------------
// Cree le lecteur de la sequence de repas Lil' Birb.
//
// Retour :
// - lecteur configure pour les trois images du repas.
// ----------------------------------------------------------------------------
function createLilBirbEat(): StreamingAnimation {
  return new SpritePlayerAnimation(LIL_BIRB_EAT_CLIP);
}

// ----------------------------------------------------------------------------
// Cree le lecteur de la sequence de decollage Lil' Birb.
//
// Retour :
// - lecteur configure pour les neuf images du decollage.
// ----------------------------------------------------------------------------
function createLilBirbTakeOff(): StreamingAnimation {
  return new SpritePlayerAnimation(LIL_BIRB_TAKE_OFF_CLIP);
}

// ----------------------------------------------------------------------------
// Cree le lecteur de la sequence de vol Lil' Birb.
//
// Retour :
// - lecteur configure pour les quatre images du vol.
// ----------------------------------------------------------------------------
function createLilBirbFlight(): StreamingAnimation {
  return new SpritePlayerAnimation(LIL_BIRB_FLIGHT_CLIP);
}

// ----------------------------------------------------------------------------
// Cree le lecteur de la sequence d'atterrissage Lil' Birb.
//
// Retour :
// - lecteur configure pour les dix images de l'atterrissage.
// ----------------------------------------------------------------------------
function createLilBirbLanding(): StreamingAnimation {
  return new SpritePlayerAnimation(LIL_BIRB_LANDING_CLIP);
}

// ----------------------------------------------------------------------------
// Retourne les definitions immuables destinees au selecteur d'animations.
//
// Retour :
// - catalogue dans son ordre d'affichage.
// ----------------------------------------------------------------------------
export function listStreamingAnimations(): readonly StreamingAnimationDefinition[] {
  return STREAMING_ANIMATIONS;
}

// ----------------------------------------------------------------------------
// Cree une animation depuis son identifiant avec repli sur la sphere.
//
// Parametres :
// - animationId : identifiant issu de l'etat de l'interface.
//
// Retour :
// - nouvelle instance independante prete a etre initialisee.
// ----------------------------------------------------------------------------
export function createStreamingAnimation(animationId: string): StreamingAnimation {
  const definition = findStreamingAnimation(animationId) ?? STREAMING_ANIMATIONS[0];
  return definition?.create() ?? new MovingSphereAnimation();
}

// ----------------------------------------------------------------------------
// Retourne le libelle d'une animation avec le meme repli que la fabrique.
//
// Parametres :
// - animationId : identifiant cherche dans le catalogue.
//
// Retour :
// - libelle utilisateur de l'entree trouvee ou de la sphere par defaut.
// ----------------------------------------------------------------------------
export function getStreamingAnimationLabel(animationId: string): string {
  return findStreamingAnimation(animationId)?.label
    ?? STREAMING_ANIMATIONS[0]?.label
    ?? "Animation web";
}

// ----------------------------------------------------------------------------
// Recherche une definition sans exposer une fonction de comparaison anonyme.
//
// Parametres :
// - animationId : identifiant stable a comparer.
//
// Retour :
// - definition correspondante, ou undefined si elle est absente.
// ----------------------------------------------------------------------------
function findStreamingAnimation(animationId: string): StreamingAnimationDefinition | undefined {
  for (const definition of STREAMING_ANIMATIONS) {
    if (definition.id === animationId) return definition;
  }
  return undefined;
}
