import { defineConfig } from 'vite';

// Relative base lets the build work on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020'
  }
});
