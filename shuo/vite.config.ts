import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = fileURLToPath(new URL('.', import.meta.url));

// Shuō is built as a static bundle that Tausi serves at /shuo/ (same origin,
// so it shares Tausi's Supabase sign-in cookies). Supabase settings come from
// Tausi's own .env (NEXT_PUBLIC_*); no AI key is ever bundled.
export default defineConfig({
  root: here,
  base: '/shuo/',
  envDir: `${here}/..`,
  envPrefix: ['NEXT_PUBLIC_SUPABASE_'],
  plugins: [react()],
  build: {
    outDir: `${here}/../public/shuo`,
    emptyOutDir: true,
  },
  server: { port: 5178 },
});
