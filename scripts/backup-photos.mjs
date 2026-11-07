// Lädt alle Fotos aus dem privaten Storage-Bucket "memories" herunter (für das wöchentliche Backup).
// Aufruf: SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/backup-photos.mjs <zielordner>
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const [, , target = 'backup/fotos'] = process.argv;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SECRET_KEY fehlen');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const bucket = supabase.storage.from('memories');

async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...(await listAll(full))); // Ordner
      else out.push(full);
    }
    if (data.length < 1000) break;
  }
  return out;
}

const files = await listAll('');
console.log(`${files.length} Dateien gefunden`);
let done = 0;
for (const file of files) {
  const dest = path.join(target, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const { data, error } = await bucket.download(file);
  if (error) {
    console.error('Fehler bei', file, error.message);
    continue;
  }
  fs.writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
  done++;
}
console.log(`${done} Dateien gesichert`);
