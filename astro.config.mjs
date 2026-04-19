// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Sembunyikan Astro Dev Toolbar
  devToolbar: {
    enabled: false,
  },
  output: 'server',
  server: {
    port: 5555, // Mengubah port ke 5555
  },
  vite: {
    plugins: [tailwindcss()]
  }
});