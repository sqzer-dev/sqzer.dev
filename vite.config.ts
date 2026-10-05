import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The page talks to its own origin and to nothing else. Written once, here (ADR-0002 D3).
const csp =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; " +
  "connect-src 'self'; img-src 'self' blob:; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";
// The charset tag of `index.html`, however the formatter closes it.
const charset = /<meta charset="utf-8"\s*\/?>/u;

const LICENCES = 'licenses.txt';

// What the page carries that Vite's list leaves out: `sqzer` is in the worker's bundle, and the rest
// reaches the page as a stylesheet or a font. Each with the licence files of its package.
const UNLISTED = {
  sqzer: ['LICENSE-MIT', 'LICENSE-APACHE'],
  geist: ['LICENSE.txt'],
  '@radix-ui/colors': ['LICENSE'],
  tailwindcss: ['LICENSE'],
  'tw-animate-css': ['LICENSE'],
  shadcn: ['LICENSE.md'],
};

function isManifest(value: unknown): value is { version: string; license: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'string' &&
    'license' in value &&
    typeof value.license === 'string'
  );
}

/** Vite lists the licences of what the page's script carries (ADR-0003 D7). The rest is added here. */
function unlistedLicences(): Plugin {
  let root = '';
  const read = (name: string, file: string) => readFileSync(join(root, 'node_modules', name, file), 'utf8').trim();
  const entry = (name: string, files: string[]) => {
    const manifest: unknown = JSON.parse(read(name, 'package.json'));
    if (!isManifest(manifest)) throw new Error(`${name} states no version or no licence`);
    const texts = files.map((file) => read(name, file)).join('\n\n');
    return `## ${name} - ${manifest.version} (${manifest.license})\n\n${texts}\n`;
  };
  return {
    name: 'unlisted-licences',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // after the files are written. reading the list first fails the build when it is not there
    writeBundle({ dir = 'dist' }) {
      const file = join(dir, LICENCES);
      const entries = Object.entries(UNLISTED).map(([name, files]) => entry(name, files));
      writeFileSync(file, `${readFileSync(file, 'utf8').trimEnd()}\n\n${entries.join('\n')}`);
    },
  };
}

export default defineConfig({
  plugins: [
    // React Compiler in Rust. the fallback: `react()` plus `babel({ presets: [reactCompilerPreset()] })`
    react({ compiler: true }),
    tailwindcss(),
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
    unlistedLicences(),
  ],
  resolve: { tsconfigPaths: true },
  css: {
    postcss: {
      plugins: [
        {
          // Radix Colors scopes its dark scales to a `.dark` class. The page has no script to set one
          // (ADR-0002 D3), so they move under `prefers-color-scheme` (ADR-0003 D4).
          postcssPlugin: 'dark-by-media',
          Rule(rule, { AtRule }) {
            if (rule.selectors.join() !== '.dark,.dark-theme') return;
            const dark = new AtRule({ name: 'media', params: '(prefers-color-scheme: dark)' });
            dark.append(rule.clone({ selector: ':root' }));
            rule.replaceWith(dark);
          },
        },
      ],
    },
  },
  // no `data:` URIs: Vite inlines small assets as base64 by default, and the policy refuses them
  build: { assetsInlineLimit: 0, license: { fileName: LICENCES } },
  // the worker is a module, and imports `sqzer` like any other module
  worker: { format: 'es' },
  // pre-bundling in development would move `sqzer.js` away from its `sqzer_bg.wasm`
  optimizeDeps: { exclude: ['sqzer'] },
});
