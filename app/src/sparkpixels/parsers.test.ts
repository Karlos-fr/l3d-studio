// ============================================================================
// SparkPixelsParsersTest - Implementation des tests des parseurs Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier valide le parsing des variables compactes exposees par le firmware
// SparkPixelsMega. Il ne depend pas de Particle Cloud ni du DOM.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  parseAuxSwitchList,
  parseModeDefinitions,
  parseModeList,
  parseModeParamList,
} from "./parsers";

// Liste partielle de modes issue de la structure firmware.
const SAMPLE_MODE_LIST = "Off;Shuffle;AcidDream;Breathe;Cubes;Text;";

// Liste partielle de parametres respectant les formats firmware observes.
const SAMPLE_MODE_PARAM_LIST =
  'N;N;N;C:1,S:1,"Sweep BG";C:4,S:4,"Fill""Sweep BG""Bleed Edges""Bleed Sides";C:2,S:4,"Bolden""No BG""Black Text""Sweep BG",T:;';

// Liste d'interrupteurs auxiliaires issue des structures firmware.
const SAMPLE_AUX_SWITCH_LIST =
  "2,Shuffle,ON,OFF,1;0,Auto Shut Off,ON,OFF,1;1,On Startup,Run Last Mode,Run Demo,0;";

// ----------------------------------------------------------------------------
// Execute les tests des parseurs Spark Pixels.
// ----------------------------------------------------------------------------
function runSparkPixelsParserTests(): void {
  it("parse une liste de modes separee par points-virgules", () => {
    expect(parseModeList(SAMPLE_MODE_LIST)).toEqual([
      { name: "Off", index: 0 },
      { name: "Shuffle", index: 1 },
      { name: "AcidDream", index: 2 },
      { name: "Breathe", index: 3 },
      { name: "Cubes", index: 4 },
      { name: "Text", index: 5 },
    ]);
  });

  it("parse les parametres de modes", () => {
    const parameters = parseModeParamList(SAMPLE_MODE_PARAM_LIST);

    expect(parameters[0]?.colorCount).toBe(0);
    expect(parameters[3]?.colorCount).toBe(1);
    expect(parameters[3]?.switchLabels).toEqual(["Sweep BG"]);
    expect(parameters[4]?.switchLabels).toEqual([
      "Fill",
      "Sweep BG",
      "Bleed Edges",
      "Bleed Sides",
    ]);
    expect(parameters[5]?.acceptsText).toBe(true);
  });

  it("fusionne les modes avec leurs parametres", () => {
    const definitions = parseModeDefinitions(SAMPLE_MODE_LIST, SAMPLE_MODE_PARAM_LIST);

    expect(definitions[3]?.name).toBe("Breathe");
    expect(definitions[3]?.parameters.colorCount).toBe(1);
    expect(definitions[5]?.name).toBe("Text");
    expect(definitions[5]?.parameters.acceptsText).toBe(true);
  });

  it("parse les interrupteurs auxiliaires globaux", () => {
    expect(parseAuxSwitchList(SAMPLE_AUX_SWITCH_LIST)).toEqual([
      {
        id: 2,
        title: "Shuffle",
        onName: "ON",
        offName: "OFF",
        enabled: true,
        raw: "2,Shuffle,ON,OFF,1",
      },
      {
        id: 0,
        title: "Auto Shut Off",
        onName: "ON",
        offName: "OFF",
        enabled: true,
        raw: "0,Auto Shut Off,ON,OFF,1",
      },
      {
        id: 1,
        title: "On Startup",
        onName: "Run Last Mode",
        offName: "Run Demo",
        enabled: false,
        raw: "1,On Startup,Run Last Mode,Run Demo,0",
      },
    ]);
  });

}

describe("SparkPixelsParsers", runSparkPixelsParserTests);
