import { defineConfig } from 'vite';

export default defineConfig({
  // SHEET_URL (the Google Sheet web app link) is built into the page. It is
  // safe to expose: it can only add a sign-up row, like the form itself.
  envPrefix: ['VITE_', 'SHEET_URL'],
});
