import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Gemeinsamer Supabase-Client für die ganze App (wird ab Schritt 2 genutzt). */
export const supabase = createClient(url, key);
