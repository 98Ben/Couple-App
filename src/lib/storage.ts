// Kleiner, sicherer Wrapper um localStorage (kann in manchen Modi fehlschlagen).
// Wird später durch Supabase ersetzt; bis dahin nur lokal auf diesem Gerät.
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignorieren */
  }
}
