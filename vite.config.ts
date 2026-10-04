import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The page talks to its own origin and to nothing else. Written once, here (ADR-0002 D3).
const csp =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; " +
  "connect-src 'self'; img-src 'self' blob:; style-src 'self'; base-uri 'none'; form-action 'none'";
// The charset tag of `index.html`, however the formatter closes it.
const charset = /<meta charset="utf-8"\s*\/?>/u;

export default defineConfig({
  plugins: [
    // React Compiler in Rust. the fallback: `react()` plus `babel({ presets: [reactCompilerPreset()] })`
    react({ compiler: true }),
    {
      // the development server goes without the policy: Fast Refresh there is an inline script
      name: 'csp',
      apply: 'build',
      transformIndexHtml(html) {
        // a browser reads the charset in the first 1024 bytes, so the policy goes after it
        if (!charset.test(html)) throw new Error('index.html has no `<meta charset="utf-8">` to put the policy after');
        return html.replace(charset, `$&\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
      },
    },
  ],
  resolve: { tsconfigPaths: true },
  // no `data:` URIs: Vite inlines small assets as base64 by default, and the policy refuses them
  build: { assetsInlineLimit: 0 },
  // the worker is a module, and imports `sqzer` like any other module
  worker: { format: 'es' },
  // pre-bundling in development would move `sqzer.js` away from its `sqzer_bg.wasm`
  optimizeDeps: { exclude: ['sqzer'] },
});
