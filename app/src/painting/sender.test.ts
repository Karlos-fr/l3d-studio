// ============================================================================
// PaintingSenderTest - Tests de la file LAN du peintre
// ----------------------------------------------------------------------------
// Ce fichier verifie l'envoi immediat, la cadence bornee et l'absence de POST
// concurrents avec des transports simules. Il ne lance aucun serveur HTTP.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { StreamingFramebuffer } from "../streaming/framebuffer";
import { PainterFrameSender } from "./sender";

// ----------------------------------------------------------------------------
// Execute les tests de la file de peinture.
// ----------------------------------------------------------------------------
function runPaintingSenderTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que le premier changement part sans attendre et que les suivants
  // sont regroupes dans la derniere frame de l'intervalle.
  // --------------------------------------------------------------------------
  it("envoie immediatement puis regroupe les modifications rapprochees", async () => {
    vi.useFakeTimers();
    const sentFrames: Uint8Array[] = [];

    // ------------------------------------------------------------------------
    // Conserve chaque payload transmis par la file.
    //
    // Parametres :
    // - frame : frame RGB332 emise.
    // ------------------------------------------------------------------------
    async function collectFrame(frame: Uint8Array): Promise<void> {
      sentFrames.push(frame);
    }

    // ------------------------------------------------------------------------
    // Echoue le test si une erreur inattendue remonte.
    //
    // Parametres :
    // - error : erreur inattendue du transport.
    // ------------------------------------------------------------------------
    function rejectUnexpectedError(error: unknown): void {
      throw error;
    }

    const sender = new PainterFrameSender(collectFrame, rejectUnexpectedError, 20);
    const framebuffer = new StreamingFramebuffer();
    sender.enable();
    framebuffer.setVoxel(0, 0, 0, 255, 0, 0);
    sender.schedule(framebuffer);
    expect(sentFrames).toHaveLength(1);
    expect(sentFrames[0]?.[0]).toBe(0xe0);
    framebuffer.setVoxel(0, 0, 0, 0, 255, 0);
    sender.schedule(framebuffer);
    framebuffer.setVoxel(0, 0, 0, 0, 0, 255);
    sender.schedule(framebuffer);
    await vi.advanceTimersByTimeAsync(19);
    expect(sentFrames).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sentFrames).toHaveLength(2);
    expect(sentFrames[1]?.[0]).toBe(0x03);
    sender.disable();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Verifie qu'une modification pendant un POST attend sa fin.
  // --------------------------------------------------------------------------
  it("ne lance jamais deux envois en parallele", async () => {
    vi.useFakeTimers();
    let releaseFirst: () => void = () => undefined;
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    let callCount = 0;

    // ------------------------------------------------------------------------
    // Memorise le resolveur de la premiere requete bloquee.
    //
    // Parametres :
    // - resolve : fonction qui termine la promesse.
    // ------------------------------------------------------------------------
    function storeFirstResolver(resolve: () => void): void {
      releaseFirst = resolve;
    }

    // ------------------------------------------------------------------------
    // Simule une premiere requete longue puis une seconde immediate.
    // ------------------------------------------------------------------------
    async function sendControlledFrame(): Promise<void> {
      callCount += 1;
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      if (callCount === 1) {
        await new Promise<void>(storeFirstResolver);
      }
      activeRequests -= 1;
    }

    // ------------------------------------------------------------------------
    // Echoue le test si la file signale une erreur inattendue.
    //
    // Parametres :
    // - error : erreur inattendue du transport.
    // ------------------------------------------------------------------------
    function rejectUnexpectedError(error: unknown): void {
      throw error;
    }

    const sender = new PainterFrameSender(sendControlledFrame, rejectUnexpectedError, 10);
    const framebuffer = new StreamingFramebuffer();
    sender.enable();
    sender.schedule(framebuffer);
    framebuffer.setVoxel(1, 0, 0, 0, 255, 0);
    sender.schedule(framebuffer);
    expect(maximumActiveRequests).toBe(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(callCount).toBe(1);
    releaseFirst();
    await Promise.resolve();
    await Promise.resolve();
    expect(callCount).toBe(2);
    expect(maximumActiveRequests).toBe(1);
    sender.disable();
    vi.useRealTimers();
  });
}

describe("file d'envoi du peintre", runPaintingSenderTests);
