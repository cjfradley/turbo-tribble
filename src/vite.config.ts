import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Alias } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

/**
 * Mock mode (VITE_MOCK=true, dev server only) swaps the modules that talk to
 * Microsoft 365 and Azure for in-browser fakes in src/mocks/. The app code keeps
 * importing the real paths. Builds never apply this, so mocks can't reach production.
 */
const mockAliases: Alias[] = [
  { find: /^@\/auth\/msal$/, replacement: src('mocks/auth.ts') },
  { find: /^@\/services\/storage$/, replacement: src('mocks/storage.ts') },
  { find: /^@\/services\/graph$/, replacement: src('mocks/graph.ts') },
]

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const mock = command === 'serve' && mode !== 'test' && env.VITE_MOCK === 'true'

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Fluent UI Web Components are native custom elements, not Vue components.
            isCustomElement: (tag) => tag.startsWith('fluent-'),
          },
        },
      }),
      vueDevTools(),
      {
        name: 'doclib:mock-mode-notice',
        configureServer() {
          if (mock) console.info('\n  Mock mode: no Microsoft 365 or Azure calls are made.\n')
        },
      },
    ],
    define: {
      // Compile-time constant: literally `false` in builds, so mock imports are removed
      // before bundling and no mock chunk is emitted.
      __MOCK_MODE__: JSON.stringify(mock),
    },
    resolve: {
      // Mock aliases must come first so they win over the general '@' alias.
      alias: [...(mock ? mockAliases : []), { find: '@', replacement: src('') }],
    },
    server: {
      // Must match a SPA redirect URI registered on the Entra app registration.
      port: 5173,
      strictPort: true,
    },
  }
})
