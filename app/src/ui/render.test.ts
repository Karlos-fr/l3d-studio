// ============================================================================
// UiRenderTest - Tests du rendu des espaces et ateliers principaux
// ----------------------------------------------------------------------------
// Ce fichier inspecte le HTML produit sans navigateur reel. Il ne branche pas
// les evenements ni les appels LAN.
// ============================================================================

import { describe, expect, it } from "vitest";
import { renderApp } from "./render";
import { createInitialState } from "./state";

// Racine minimale acceptee par renderApp pour capturer son HTML.
interface RenderRoot {
  innerHTML: string;
}

// ----------------------------------------------------------------------------
// Execute les tests des espaces principaux et du panneau Streaming.
// ----------------------------------------------------------------------------
function runWorkspaceRenderTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que Cube et Animations possedent des responsabilites distinctes.
  // --------------------------------------------------------------------------
  it("isole les animations embarquees dans leur propre espace", () => {
    // Etat initial ouvert sur l'espace Cube.
    const state = createInitialState(null);
    // Racine reutilisee pour comparer les deux espaces rendus.
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain("État du cube");
    expect(root.innerHTML).not.toContain("Animation courante");
    expect(root.innerHTML.indexOf("show-workspace-animations")).toBeGreaterThan(
      root.innerHTML.indexOf("show-workspace-cube"),
    );

    state.activeWorkspace = "animations";
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain("Animation courante");
    expect(root.innerHTML).not.toContain("État du cube");
    expect(root.innerHTML).toContain("animations sont embarquées");
  });

  // --------------------------------------------------------------------------
  // Verifie les quatre icones, la source de rendu et le bandeau de sante.
  // --------------------------------------------------------------------------
  it("rend la synthese detaillee de l'etat du cube", () => {
    // Etat lu representatif d'un flux de peinture actif.
    const state = createInitialState(null);
    state.currentModeName = "Stream";
    state.currentPlaybackKind = "painting";
    state.wifiRssi = -58;
    state.wifiReady = true;
    state.lastCommandResult = 0;
    state.firmwareRevision = "1.4";
    state.deviceOsVersion = "2.3.1";
    state.uptimeSeconds = 183_845;
    // Racine qui capture les quatre cartes et leur bandeau.
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML.match(/cube-state-icon/g)).toHaveLength(4);
    expect(root.innerHTML).toContain("Peinture");
    expect(root.innerHTML).toContain("Image fixe");
    expect(root.innerHTML).toContain("Statut :</strong> Prêt");
    expect(root.innerHTML).toContain("Device OS</strong> 2.3.1");
    expect(root.innerHTML).toContain("Firmware</strong> 1.4");
    expect(root.innerHTML).toContain("Uptime</strong> 2 j 03:04:05");
    expect(root.innerHTML.indexOf("Device OS</strong>")).toBeGreaterThan(
      root.innerHTML.indexOf("Statut :</strong>"),
    );
  });

  // --------------------------------------------------------------------------
  // Verifie le panneau centre avec une seule action de connexion.
  // --------------------------------------------------------------------------
  it("simplifie les actions du panneau de connexion", () => {
    // Etat qui force l'ouverture de la configuration LAN.
    const state = createInitialState(null);
    state.connectionPanelOpen = true;
    // Racine qui capture le panneau sans navigateur reel.
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain('data-action="connect-lan"');
    expect(root.innerHTML).toContain('data-field="auto-connect"');
    expect(root.innerHTML).toContain('role="tooltip"');
    expect(root.innerHTML).toContain("connection-summary-icon");
    expect(root.innerHTML).toContain("connection-close-action");
    expect(root.innerHTML).not.toContain("sidebar-connection");
    expect(root.innerHTML).not.toContain("Tester le LAN");
    expect(root.innerHTML).not.toContain("Lire le cube");
    expect(root.innerHTML).not.toContain("Dernier :");
    expect(root.innerHTML).not.toContain("Connecté : firmware");

    state.lastTransportUsed = "lan";
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain('data-action="disconnect-lan"');
    expect(root.innerHTML).toContain("Déconnexion");
  });

  // --------------------------------------------------------------------------
  // Verifie les controles d'animation proposes au premier chargement.
  // --------------------------------------------------------------------------
  it("affiche l'atelier Animations par defaut", () => {
    const state = createInitialState(null);
    state.activeWorkspace = "streaming";
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain("show-streaming-animations");
    expect(root.innerHTML).toContain("show-streaming-painting");
    expect(root.innerHTML).toContain('data-field="streaming-animation"');
    expect(root.innerHTML).not.toContain("streaming-preview-dots");
    expect(root.innerHTML).not.toContain('data-field="painter-color"');
  });

  // --------------------------------------------------------------------------
  // Verifie que Peinture remplace les reglages de cadence par quatre outils.
  // --------------------------------------------------------------------------
  it("affiche uniquement les outils essentiels du peintre", () => {
    const state = createInitialState(null);
    state.activeWorkspace = "streaming";
    state.streaming.workspace = "painting";
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain('data-field="painter-color"');
    expect(root.innerHTML).toContain('data-action="painter-tool-draw"');
    expect(root.innerHTML).toContain('data-action="painter-tool-erase"');
    expect(root.innerHTML).toContain('data-action="clear-painter"');
    expect(root.innerHTML).not.toContain("Destination :");
    expect(root.innerHTML).toContain('data-field="painter-brightness"');
    expect(root.innerHTML).toContain('data-field="painter-global-brightness"');
    expect(root.innerHTML).toContain('data-action="export-painter"');
    expect(root.innerHTML).toContain('data-field="painter-import"');
    expect(root.innerHTML).toContain("Afficher sur le cube");
    expect(root.innerHTML).not.toContain('data-field="streaming-fps"');
  });
}

describe("rendu des espaces de travail", runWorkspaceRenderTests);
