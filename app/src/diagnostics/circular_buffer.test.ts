// ============================================================================
// CircularBufferTest - Tests du stockage circulaire generique
// ----------------------------------------------------------------------------
// Ce fichier verifie ordre, ecrasement et nettoyage sans connaitre les KPI.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  circularBufferValues,
  clearCircularBuffer,
  createCircularBuffer,
  pushCircularBuffer,
} from "./circular_buffer";

// ----------------------------------------------------------------------------
// Execute les scenarios du buffer circulaire.
// ----------------------------------------------------------------------------
function runCircularBufferTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que les valeurs les plus recentes remplacent les plus anciennes.
  // --------------------------------------------------------------------------
  it("conserve sa capacite et son ordre chronologique", () => {
    const buffer = createCircularBuffer<number>(3);
    pushCircularBuffer(buffer, 1);
    pushCircularBuffer(buffer, 2);
    pushCircularBuffer(buffer, 3);
    pushCircularBuffer(buffer, 4);

    expect(circularBufferValues(buffer)).toEqual([2, 3, 4]);
    expect(buffer.storage).toHaveLength(3);
  });

  // --------------------------------------------------------------------------
  // Verifie que le nettoyage conserve la meme allocation et capacite.
  // --------------------------------------------------------------------------
  it("se vide sans changer de stockage", () => {
    const buffer = createCircularBuffer<number>(2);
    const originalStorage = buffer.storage;
    pushCircularBuffer(buffer, 1);
    clearCircularBuffer(buffer);

    expect(buffer.storage).toBe(originalStorage);
    expect(buffer.length).toBe(0);
    expect(circularBufferValues(buffer)).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Verifie le refus d'une capacite inutilisable.
  // --------------------------------------------------------------------------
  it("refuse une capacite nulle", () => {
    expect(() => createCircularBuffer<number>(0)).toThrow("entier positif");
  });
}

describe("buffer circulaire", runCircularBufferTests);
