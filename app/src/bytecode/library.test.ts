// ============================================================================
// BytecodeLibraryTest - Tests de la bibliotheque procedurale locale
// ----------------------------------------------------------------------------
// Ce fichier verifie creation, edition, export et import sans navigateur reel
// ni donnee Particle.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  createBytecodeLibraryEntry,
  duplicateBytecodeLibraryEntry,
  exportBytecodeLibrary,
  importBytecodeLibrary,
  loadBytecodeLibrary,
  renameBytecodeLibraryEntry,
  saveBytecodeLibrary,
  updateBytecodeLibraryEntry,
} from "./library";

// ----------------------------------------------------------------------------
// Cree un stockage memoire compatible avec localStorage.
//
// Retour :
// - doublure minimale pour les fonctions de bibliotheque.
// ----------------------------------------------------------------------------
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

// ----------------------------------------------------------------------------
// Regroupe les scenarios de bibliotheque locale.
// ----------------------------------------------------------------------------
function runLibraryTests(): void {
  // --------------------------------------------------------------------------
  // Verifie le cycle complet d'une source utilisateur.
  // --------------------------------------------------------------------------
  it("cree, modifie, duplique et recharge une source", () => {
    const storage = createMemoryStorage();
    const original = createBytecodeLibraryEntry("Rain perso", "CLEAR\nSHOW\n", 100, 0.5);
    const renamed = renameBytecodeLibraryEntry(original, "Rain bleu", 101);
    const updated = updateBytecodeLibraryEntry(renamed, "COLOR_RGB 0 0 255\nSHOW\n", 102);
    const duplicate = duplicateBytecodeLibraryEntry(updated, 103);
    saveBytecodeLibrary(storage, [updated, duplicate]);
    expect(loadBytecodeLibrary(storage)).toEqual([updated, duplicate]);
    expect(duplicate.id).not.toBe(updated.id);
  });

  // --------------------------------------------------------------------------
  // Verifie que l'export ne contient que les champs proceduraux autorises.
  // --------------------------------------------------------------------------
  it("exporte et importe sans token ni configuration reseau", () => {
    const entry = createBytecodeLibraryEntry("Plasma", "CLEAR\nSHOW\n", 200, 0.25);
    const serialized = exportBytecodeLibrary([entry]);
    expect(serialized).not.toMatch(/token|particle|lanHost|password/iu);
    expect(importBytecodeLibrary(serialized)).toEqual([entry]);
  });

  // --------------------------------------------------------------------------
  // Verifie le rejet atomique des documents malformes.
  // --------------------------------------------------------------------------
  it("refuse les versions inconnues et les sources excessives", () => {
    expect(() => importBytecodeLibrary('{"version":2,"entries":[]}')).toThrow("Version");
    expect(() => createBytecodeLibraryEntry("", "CLEAR")).toThrow("nom");
    expect(() => createBytecodeLibraryEntry("X", "A".repeat(16_385))).toThrow("source");
  });
}

describe("bibliotheque bytecode", runLibraryTests);
