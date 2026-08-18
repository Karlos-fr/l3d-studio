// ============================================================================
// LanParsersTest - Tests des parseurs purs de l'API locale
// ----------------------------------------------------------------------------
// Ce fichier couvre les réponses valides et les erreurs de schéma. Il ne lance
// aucun appel réseau et ne dépend pas du DOM.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  parseLanAuxSwitches,
  parseLanCommandResponse,
  parseLanDiagnostics,
  parseLanHealth,
  parseLanModes,
  parseLanState,
} from "./parsers";

// Exemple complet de santé version 1.
const HEALTH_RESPONSE = "v=1\nfw=1.4\nos=2.3.1\nu=3564\ni=1\nk=0\n";

// Exemple complet de diagnostic version 1.
const DIAGNOSTICS_RESPONSE =
  "v=1,y=4,m=30,u=3564,r=70,d=0,s=37944,f=35400,n=34024,b=37928,a=35400,q=35400,c=73,l=152989,g=152282,w=152989,p=65,x=20,i=1,k=1,o=-1,z=0";

// Exemple complet d'état version 1.
const STATE_RESPONSE =
  "v=1\nm=2\nname=ColorAll\nb=2\ns=4\ncolors=0000FF;FF0000;00FF00;0000FF;FFFF00;00FFFF\nswitches=0;1;0;1\ni=1\nk=1\nr=-103\n";

// Catalogue minimal de deux modes parallèles.
const MODES_RESPONSE = "v=1\nnames=Off;Text;\nparams=N;C:2,T:;\n";

// Liste minimale d'un switch auxiliaire.
const AUX_RESPONSE = "v=1\nswitches=2,Shuffle,ON,OFF,1;\n";

// ----------------------------------------------------------------------------
// Execute les tests des parseurs LAN.
// ----------------------------------------------------------------------------
function runLanParserTests(): void {
  // --------------------------------------------------------------------------
  // Verifie l'enveloppe commune des commandes positives et refusees.
  // --------------------------------------------------------------------------
  it("parse le resultat historique d'une commande", () => {
    expect(parseLanCommandResponse("v=1\nresult=-103\n")).toEqual({
      protocolVersion: 1,
      result: -103,
    });
  });

  // --------------------------------------------------------------------------
  // Vérifie la conversion de la santé et l'ignorance des champs futurs.
  // --------------------------------------------------------------------------
  it("parse la santé et ignore les champs inconnus", () => {
    expect(parseLanHealth(`${HEALTH_RESPONSE}future=42\n`)).toEqual({
      protocolVersion: 1,
      firmwareRevision: "1.4",
      deviceOsVersion: "2.3.1",
      uptimeSeconds: 3564,
      wifiReady: true,
      particleConnected: false,
    });
  });

  // --------------------------------------------------------------------------
  // Vérifie toutes les clés numériques du diagnostic compact.
  // --------------------------------------------------------------------------
  it("parse toutes les mesures de diagnostics", () => {
    const diagnostics = parseLanDiagnostics(DIAGNOSTICS_RESPONSE);
    expect(diagnostics.sequence).toBe(4);
    expect(diagnostics.modeId).toBe(30);
    expect(diagnostics.minimumFreeMemory).toBe(34024);
    expect(diagnostics.averageFrameMicros).toBe(152282);
    expect(diagnostics.lastOutOfMemoryBytes).toBe(-1);
    expect(diagnostics.particleConnected).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Vérifie les réglages nécessaires pour reconstruire l'état du cube.
  // --------------------------------------------------------------------------
  it("parse l'état complet du cube", () => {
    expect(parseLanState(STATE_RESPONSE)).toEqual({
      schemaVersion: 1,
      modeId: 2,
      modeName: "ColorAll",
      brightness: 2,
      speedIndex: 4,
      colors: ["0000FF", "FF0000", "00FF00", "0000FF", "FFFF00", "00FFFF"],
      switches: [false, true, false, true],
      wifiReady: true,
      particleConnected: true,
      lastCommandResult: -103,
    });
  });

  // --------------------------------------------------------------------------
  // Vérifie la réutilisation des parseurs Spark Pixels pour les catalogues.
  // --------------------------------------------------------------------------
  it("reconstruit les modes et les switches auxiliaires", () => {
    const modes = parseLanModes(MODES_RESPONSE);
    const auxSwitches = parseLanAuxSwitches(AUX_RESPONSE);
    expect(modes.modes).toHaveLength(2);
    expect(modes.modes[1]?.name).toBe("Text");
    expect(modes.modes[1]?.parameters.acceptsText).toBe(true);
    expect(auxSwitches.switches[0]?.title).toBe("Shuffle");
    expect(auxSwitches.switches[0]?.enabled).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Vérifie le refus des versions absentes ou non prises en charge.
  // --------------------------------------------------------------------------
  it("refuse les versions absentes ou inconnues", () => {
    // Fonction nommée permettant de vérifier une version manquante.
    function parseMissingVersion(): void {
      parseLanHealth("fw=1.4\nos=2.3.1\nu=1\ni=1\nk=1\n");
    }

    // Fonction nommée permettant de vérifier une version future.
    function parseFutureVersion(): void {
      parseLanHealth(HEALTH_RESPONSE.replace("v=1", "v=2"));
    }

    expect(parseMissingVersion).toThrow("Champ LAN manquant: v");
    expect(parseFutureVersion).toThrow("Version LAN non prise en charge");
  });

  // --------------------------------------------------------------------------
  // Vérifie le refus des champs manquants, dupliqués et mal formés.
  // --------------------------------------------------------------------------
  it("refuse les champs invalides", () => {
    // Fonction nommée vérifiant un champ obligatoire manquant.
    function parseMissingStateField(): void {
      parseLanState(STATE_RESPONSE.replace("name=ColorAll\n", ""));
    }

    // Fonction nommée vérifiant un champ dupliqué.
    function parseDuplicateField(): void {
      parseLanHealth(`${HEALTH_RESPONSE}i=0\n`);
    }

    // Fonction nommée vérifiant une couleur invalide.
    function parseInvalidColor(): void {
      parseLanState(STATE_RESPONSE.replace("0000FF", "GG0000"));
    }

    expect(parseMissingStateField).toThrow("Champ LAN manquant: name");
    expect(parseDuplicateField).toThrow("Champ LAN duplique: i");
    expect(parseInvalidColor).toThrow("Couleur LAN invalide");
  });

  // --------------------------------------------------------------------------
  // Vérifie les bornes entières et les booléens stricts.
  // --------------------------------------------------------------------------
  it("refuse les nombres hors plage et les booléens ambigus", () => {
    // Fonction nommée vérifiant le dépassement d'un entier firmware.
    function parseOverflow(): void {
      parseLanHealth(HEALTH_RESPONSE.replace("u=3564", "u=4294967296"));
    }

    // Fonction nommée vérifiant un booléen différent de zéro ou un.
    function parseAmbiguousBoolean(): void {
      parseLanHealth(HEALTH_RESPONSE.replace("i=1", "i=2"));
    }

    expect(parseOverflow).toThrow("Entier LAN hors plage: u");
    expect(parseAmbiguousBoolean).toThrow("Entier LAN hors plage: i");
  });
}

describe("LanParsers", runLanParserTests);
