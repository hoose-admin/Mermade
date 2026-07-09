import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

/**
 * HMR creates state inconsistencies for this app (Monaco / mermaid), so on a
 * real source edit we force a full reload instead. But ONLY for source files:
 * writes to data files the app itself may create under the repo (a bound `.mmd`
 * or the AI-history JSON) or build output must not blow away in-progress UI
 * state (e.g. a half-typed AI prompt).
 * @type {import('vite').PluginOption} PluginOption
 */
const alwaysFullReload = {
  name: 'always-full-reload',
  handleHotUpdate({ file, server }) {
    if (!file.includes('/src/')) {
      return; // not a source change — let Vite handle it (usually a no-op)
    }
    server.ws.send({ type: 'full-reload' });
    return [];
  }
};

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    Icons({
      compiler: 'svelte',
      customCollections: {
        custom: FileSystemIconLoader('./static/icons')
      }
    }),
    alwaysFullReload,
    devtoolsJson()
  ],
  envPrefix: 'MERMAID_',
  // 3000 is commonly taken (e.g. a Next.js app); pin to 3001 and fail loudly
  // rather than silently hopping ports, so the dev URL stays predictable.
  // Don't watch build output — running `pnpm build` while `dev` is up shouldn't
  // trigger reloads.
  server: { port: 3001, host: true, strictPort: true, watch: { ignored: ['**/docs/**'] } },
  preview: { port: 3001, host: true, strictPort: true },
  // Vitest otherwise resolves Svelte's server build, where $effect is a no-op.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    // in-source testing
    includeSource: ['src/**/*.{js,ts,svelte}'],
    // Ignore E2E tests
    exclude: [
      'tests/**/*',
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
    ],
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      exclude: ['src/mocks', '.svelte-kit', 'src/**/*.test.ts'],
      reporter: ['text', 'json', 'html', 'lcov']
    }
  }
});
