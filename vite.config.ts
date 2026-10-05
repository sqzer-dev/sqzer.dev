import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import react from '@vitejs/plugin-react';
import sqzer from 'sqzer/package.json' with { type: 'json' };
import { defineConfig, type Plugin } from 'vite';

// The page talks to its own origin and to nothing else. Written once, here (ADR-0002 D3).
const csp =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; " +
  "connect-src 'self'; img-src 'self' blob:; style-src 'self'; base-uri 'none'; form-action 'none'";
// The charset tag of `index.html`, however the formatter closes it.
const charset = /<meta charset="utf-8"\s*\/?>/u;

const LICENCES = 'licenses.txt';

/**
 * Vite lists the licences of what the page's bundle carries (ADR-0003 D7).
 * `sqzer` is in the worker's bundle, which that list leaves out, so it is added here.
 */
function licenceOfSqzer(): Plugin {
  let root = '';
  const text = (name: string) => readFileSync(join(root, 'node_modules/sqzer', name), 'utf8').trim();
  return {
    name: 'licence-of-sqzer',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // after the files are written. reading the list first fails the build when it is not there
    writeBundle({ dir = 'dist' }) {
      const file = join(dir, LICENCES);
      const entry = `## sqzer - ${sqzer.version} (${sqzer.license})\n\n${text('LICENSE-MIT')}\n\n${text('LICENSE-APACHE')}\n`;
      writeFileSync(file, `${readFileSync(file, 'utf8').trimEnd()}\n\n${entry}`);
    },
  };
}

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
    licenceOfSqzer(),
  ],
  resolve: { tsconfigPaths: true },
  // no `data:` URIs: Vite inlines small assets as base64 by default, and the policy refuses them
  build: { assetsInlineLimit: 0, license: { fileName: LICENCES } },
  // the worker is a module, and imports `sqzer` like any other module
  worker: { format: 'es' },
  // pre-bundling in development would move `sqzer.js` away from its `sqzer_bg.wasm`
  optimizeDeps: { exclude: ['sqzer'] },
});
