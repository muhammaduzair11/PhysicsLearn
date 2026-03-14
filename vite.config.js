import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ph01: resolve(__dirname, 'diagrams/ph01/index.html'),
        ph02: resolve(__dirname, 'diagrams/ph02/index.html'),
        ch01: resolve(__dirname, 'diagrams/ch01/index.html'),
        ch02: resolve(__dirname, 'diagrams/ch02/index.html'),
        bi01: resolve(__dirname, 'diagrams/bi01/index.html'),
        bi02: resolve(__dirname, 'diagrams/bi02/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
