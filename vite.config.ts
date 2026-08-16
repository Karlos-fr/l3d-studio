// ============================================================================
// ViteConfig - Implementation de la configuration Vite
// ----------------------------------------------------------------------------
// Ce fichier configure l'outillage de developpement et de build. Il ne connait
// pas le protocole Particle, le firmware SparkPixelsMega ni le rendu applicatif.
// ============================================================================

import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
