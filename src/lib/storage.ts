// Kleiner, sicherer Wrapper um localStorage (kann in manchen Modi fehlschlagen).
// Nur für gerätebezogene Kleinigkeiten (z. B. „Hinweis ausgeblendet“), nie für gemeinsame Daten.
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
