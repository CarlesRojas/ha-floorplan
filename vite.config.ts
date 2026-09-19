import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    lib: {
      entry: 'src/main.tsx',
      formats: ['es'],
      fileName: () => 'card.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
    // Fonts are base64-inlined into the CSS so everything ships in card.js.
    assetsInlineLimit: Infinity,
    copyPublicDir: false,
    emptyOutDir: false,
  },
})
