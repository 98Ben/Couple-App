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

export type NoteColor = 'rose' | 'peach' | 'lav' | 'sun';

export type LoveNote = {
  id: string;
  text: string | null;
  color: NoteColor;
  doodle_path: string | null;
  heart_at: string | null;
  created_by: string;
  created_at: string;
};

export type Answer = {
  id: string;
  user_id: string;
  day: string;
  question_id: number;
  answer: string;
  created_at: string;
};

export type QuizRound = {
  id: string;
  question_ids: number[];
  submitted: string[];
  finished_at: string | null;
  created_by: string;
  created_at: string;
};

export type QuizEntry = {
  id: string;
  round_id: string;
  question_id: number;
  user_id: string;
  own_answer: string;
  guess: string;
  guess_correct: boolean | null;
};

export type MoodKey = 'energie' | 'kuschelig' | 'muede' | 'gestresst' | 'entspannt' | 'gluecklich' | 'nachdenklich' | 'krank';

export type Mood = { user_id: string; mood: MoodKey; day: string; updated_at: string };

export type Capsule = {
  id: string;
  title: string | null;
  open_on: string;
  photo_count: number;
  created_by: string;
  created_at: string;
};

export type CapsuleContent = { capsule_id: string; message: string; photo_paths: string[] };
