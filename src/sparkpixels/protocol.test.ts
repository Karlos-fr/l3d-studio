// ============================================================================
// SparkPixelsProtocolTest - Implementation des tests du protocole Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier valide la construction des commandes firmware sans appeler Particle
// Cloud et sans manipuler le DOM.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  buildSetAuxSwitchCommand,
  buildSetModeCommand,
  convertAppBrightnessToFirmwareValue,
  convertFirmwareBrightnessToAppPercent,
  normalizeHexColor,
  validateSpeedIndex,
} from "./protocol";

// ----------------------------------------------------------------------------
// Execute les tests du generateur de commandes Spark Pixels.
// ----------------------------------------------------------------------------
function runSparkPixelsProtocolTests(): void {
  it("construit une commande SetMode complete", () => {
    expect(
      buildSetModeCommand({
        modeName: "ColorAll",
        speedIndex: 4,
        brightnessPercent: 80,
        colors: ["#ff0000"],
      }),
    ).toBe("M:ColorAll,S:4,B:80,C1:FF0000,");
  });

  it("construit une commande de vitesse et luminosite sans mode", () => {
    expect(
      buildSetModeCommand({
        speedIndex: 4,
        brightnessPercent: 80,
      }),
    ).toBe("S:4,B:80,");
  });

  it("construit une commande texte avec couleurs et switches", () => {
    expect(
      buildSetModeCommand({
        modeName: "Text",
        speedIndex: 4,
        brightnessPercent: 80,
        colors: ["FFFFFF", "000000"],
        switches: [true, false],
        text: "HELLO",
      }),
    ).toBe("M:Text,S:4,B:80,C1:FFFFFF,C2:000000,T1:1,T2:0,W:HELLO,");
  });

  it("construit une commande d'interrupteur auxiliaire", () => {
    expect(buildSetAuxSwitchCommand(1, false)).toBe("SETAUXSWITCH:1,0;");
  });

  it("normalise les couleurs RGB", () => {
    expect(normalizeHexColor("#00ffaa")).toBe("00FFAA");
  });

  it("convertit la luminosite applicative vers le firmware", () => {
    expect(convertAppBrightnessToFirmwareValue(0)).toBe(1);
    expect(convertAppBrightnessToFirmwareValue(100)).toBe(255);
  });

  it("convertit la luminosite firmware vers l'interface", () => {
    expect(convertFirmwareBrightnessToAppPercent(255)).toBe(100);
    expect(convertFirmwareBrightnessToAppPercent(128)).toBe(50);
  });

  it("rejette une vitesse hors plage", () => {
    expect(() => validateSpeedIndex(9)).toThrow();
  });

  it("rejette une commande SetMode vide", () => {
    expect(() => buildSetModeCommand({})).toThrow();
  });
}

describe("SparkPixelsProtocol", runSparkPixelsProtocolTests);
