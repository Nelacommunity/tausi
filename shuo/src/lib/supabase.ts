import { createBrowserClient } from '@supabase/ssr';

// Same Supabase project and cookie-based session as Tausi. Shuō is served
// from the same origin (/shuo/), so a student signed in to Tausi is already
// signed in here.
export const supabase = createBrowserClient(
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string,
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

export interface ShuoUser { id: string; email: string | null }

let current: ShuoUser | null = null;
export const currentUser = () => current;
export const setCurrentUser = (u: ShuoUser | null) => { current = u; };
