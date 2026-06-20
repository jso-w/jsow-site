// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
// GitHub Pages project site: https://jso-w.github.io/jsow-site
export default defineConfig({
  site: 'https://jso-w.github.io/jsow-site/',
  base: '/jsow-site',
  integrations: [react()],
  vite: {
    // Force Vite to pre-bundle React with named exports. Also resolves the
    // stale-optimizer "react-dom/client does not provide createRoot" error
    // after dependency changes (changing this config triggers a re-optimize).
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
});
