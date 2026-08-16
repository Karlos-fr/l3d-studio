// ============================================================================
// ViteConfig - Implementation de la configuration Vite
// ----------------------------------------------------------------------------
// Ce fichier configure l'outillage de developpement et de build. Il ne connait
// pas le protocole Particle, le firmware SparkPixelsMega ni le rendu applicatif.
// ============================================================================

import { defineConfig } from "vite";

// Chemin public du depot quand l'application est servie par GitHub Pages.
const GITHUB_PAGES_BASE_PATH = "/l3d-studio/";

export default defineConfig({
  base: GITHUB_PAGES_BASE_PATH,
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
