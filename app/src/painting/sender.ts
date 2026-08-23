// ============================================================================
// PaintingSender - File bornee des frames de peinture LAN
// ----------------------------------------------------------------------------
// Ce module regroupe les modifications rapides et garantit un seul POST actif.
// Il ne choisit ni l'adresse LAN, ni le mode firmware, ni les outils du DOM.
// ============================================================================

import type { StreamingFramebuffer } from "../streaming/framebuffer";
import { serializeRgb332 } from "../streaming/serializer";

// Intervalle minimal entre deux departs de frame, soit 12,5 FPS au maximum.
const PAINTER_SEND_INTERVAL_MS = 80;

// Fonction reseau injectee par l'orchestrateur applicatif.
export type PainterFrameTransport = (frame: Uint8Array) => Promise<void>;

// Fonction avertie lorsqu'un envoi differe echoue.
export type PainterSendErrorHandler = (error: unknown) => void;

export class PainterFrameSender {
  // Dernier framebuffer demande, lu uniquement au debut d'un envoi.
  private pendingFramebuffer: StreamingFramebuffer | null = null;

  // Temporisation courante qui borne la cadence des departs reseau.
  private timer: ReturnType<typeof setTimeout> | null = null;

  // Vrai tant qu'une requete utilise le transport injecte.
  private inFlight = false;

  // Vrai lorsqu'une modification plus recente attend la requete courante.
  private dirty = false;

  // Autorise les envois seulement pendant une session de peinture active.
  private enabled = false;

  // --------------------------------------------------------------------------
  // Construit une file a une seule requete avec son gestionnaire d'erreur.
  //
  // Parametres :
  // - sendFrame : transport de la route painter/frame.
  // - onError : rappel des erreurs produites apres l'activation initiale.
  // - intervalMilliseconds : cadence minimale optionnelle utilisee par les tests.
  // --------------------------------------------------------------------------
  constructor(
    private readonly sendFrame: PainterFrameTransport,
    private readonly onError: PainterSendErrorHandler,
    private readonly intervalMilliseconds = PAINTER_SEND_INTERVAL_MS,
  ) {}

  // --------------------------------------------------------------------------
  // Active la file apres que la premiere frame a ete confirmee separement.
  // --------------------------------------------------------------------------
  enable(): void {
    this.enabled = true;
  }

  // --------------------------------------------------------------------------
  // Arrete les futurs envois et oublie la modification en attente.
  // --------------------------------------------------------------------------
  disable(): void {
    this.enabled = false;
    this.dirty = false;
    this.pendingFramebuffer = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Envoie le premier changement immediatement puis regroupe les suivants.
  //
  // Parametres :
  // - framebuffer : dessin vivant a serialiser au prochain depart reseau.
  // --------------------------------------------------------------------------
  schedule(framebuffer: StreamingFramebuffer): void {
    if (!this.enabled) return;
    this.pendingFramebuffer = framebuffer;
    this.dirty = true;
    if (this.inFlight || this.timer !== null) return;
    void this.flush();
  }

  // --------------------------------------------------------------------------
  // Envoie la derniere frame et ouvre une fenetre de regroupement bornee.
  //
  // Effet de bord :
  // - lance au maximum un transport a la fois et signale tout echec.
  // --------------------------------------------------------------------------
  private async flush(): Promise<void> {
    if (!this.enabled || this.inFlight || !this.dirty || this.pendingFramebuffer === null) return;
    this.dirty = false;
    this.inFlight = true;
    const payload = serializeRgb332(this.pendingFramebuffer);
    // La cadence commence au depart du POST : une requete lente n'ajoute donc
    // pas artificiellement l'intervalle complet a sa propre duree.
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.enabled && this.dirty && !this.inFlight) {
        void this.flush();
      }
    }, this.intervalMilliseconds);
    try {
      await this.sendFrame(payload);
    } catch (error) {
      this.onError(error);
    } finally {
      this.inFlight = false;
      if (this.enabled && this.dirty && this.timer === null) {
        void this.flush();
      }
    }
  }
}
