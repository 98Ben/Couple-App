/** Zeilen-Typen der Supabase-Tabellen (siehe supabase/migrations). */

export type Place = {
  id: string;
  title: string;
  happened_on: string | null;
  note: string | null;
  lat: number;
  lng: number;
  address: string | null;
  photo_path: string | null;
  created_by: string;
  created_at: string;
};

export type Moment = {
  id: string;
  title: string;
  happened_on: string;
  note: string | null;
  photo_path: string | null;
  created_by: string;
  created_at: string;
};

export type Countdown = {
  id: string;
  title: string;
  target_date: string;
  target_time: string | null;
  emoji: string | null;
  yearly: boolean;
  created_by: string;
  created_at: string;
};

export type BucketCategory = 'reisen' | 'essen' | 'abenteuer' | 'erlebnisse';

export type BucketItem = {
  id: string;
  title: string;
  category: BucketCategory;
  done_at: string | null;
  done_by: string | null;
  created_by: string;
  created_at: string;
};

export type DateIdea = {
  id: string;
  title: string;
  setting: 'drinnen' | 'draussen' | 'egal';
  cost: 'kostenlos' | 'guenstig' | 'teurer';
  created_by: string | null;
  created_at: string;
};

export type Wish = {
  id: string;
  text: string;
  fulfilled_at: string | null;
  created_by: string;
  created_at: string;
};
