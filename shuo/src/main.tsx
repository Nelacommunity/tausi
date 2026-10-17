import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setCurrentUser, supabase } from './lib/supabase';
import './styles.css';

/**
 * Start-up: Shuō needs a Tausi account (progress is saved to it and AI calls
 * go through Tausi's server). Find the signed-in user first — stores are
 * scoped to them — then load the app and the student's saved progress.
 */
async function boot() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    window.location.replace(`/login?next=${encodeURIComponent('/shuo' + window.location.hash)}`);
    return;
  }
  setCurrentUser({ id: user.id, email: user.email ?? null });

  // Imported only now, so every store is created for this user.
  const [{ default: App }, { initCloudSync }] = await Promise.all([import('./App'), import('./lib/store')]);
  await initCloudSync();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

boot();
