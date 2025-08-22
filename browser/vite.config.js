import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  base: process.env.NODE_ENV === 'production' ? '/registry-of-kinds/' : '/',
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
