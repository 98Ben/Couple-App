import type { IconName } from './icons/iconShapes';
import type { ToneKey } from './theme';

/**
 * Zentrale Liste aller Features.
 * Neue Kachel = neuer Eintrag hier. Dashboard und Routen lesen nur diese Liste.
 * `status`: 'geplant' = Platzhalterseite, 'fertig' = echte Seite unter src/pages/features/
 */
export type FeatureGroup = 'alltag' | 'nachrichten' | 'erinnerungen' | 'extras';

export type Feature = {
  id: string;
  title: string;
  short: string;
  icon: IconName;
  group: FeatureGroup;
  status: 'geplant' | 'fertig';
  planned: string[]; // was die Seite später können soll
};

export type Group = { id: FeatureGroup; title: string; navLabel: string; icon: IconName; tone: ToneKey };

export const groups: Group[] = [
  { id: 'alltag', title: 'Alltag zu zweit', navLabel: 'Alltag', icon: 'home', tone: 'peach' },
  { id: 'nachrichten', title: 'Nachrichten & Notizen', navLabel: 'Nachrichten', icon: 'plane', tone: 'rose' },
  { id: 'erinnerungen', title: 'Unsere Erinnerungen', navLabel: 'Erinnerungen', icon: 'polaroid', tone: 'lav' },
  { id: 'extras', title: 'Extras', navLabel: 'Extras', icon: 'balloon', tone: 'sun' },
];

export const features: Feature[] = [
  // Alltag
  {
    id: 'einkaufsliste',
    title: 'Einkaufsliste',
    short: 'Gemeinsam einkaufen',
    icon: 'bag',
    group: 'alltag',
    status: 'geplant',
    planned: [
      'Artikel hinzufügen, abhaken und löschen',
      'Änderungen erscheinen sofort beim anderen',
      'Push, wenn etwas Neues auf der Liste steht',
    ],
  },
  {
    id: 'todos',
    title: 'To-dos',
    short: 'Haushalt & Aufgaben',
    icon: 'checklist',
    group: 'alltag',
    status: 'geplant',
    planned: ['Aufgaben für dich, für sie oder für beide', 'Fälligkeitsdatum und wiederkehrende Aufgaben', 'Erledigt-Ansicht'],
  },
  {
    id: 'kalender',
    title: 'Kalender',
    short: 'Unsere Termine',
    icon: 'calendar',
    group: 'alltag',
    status: 'geplant',
    planned: ['Gemeinsame Termine und Dates', 'Monats- und Listenansicht', 'Erinnerung per Push'],
  },

  // Nachrichten
  {
    id: 'chat',
    title: 'Chat',
    short: 'Nur für uns zwei',
    icon: 'chat',
    group: 'nachrichten',
    status: 'geplant',
    planned: ['Privater Chat in Echtzeit', 'Fotos und Herzen senden', 'Push bei neuer Nachricht'],
  },
  {
    id: 'liebesnotizen',
    title: 'Liebesnotizen',
    short: 'Kleine Botschaften',
    icon: 'letter',
    group: 'nachrichten',
    status: 'geplant',
    planned: [
      'Kurze Notizen an den anderen schreiben',
      'Zeitversetzt: Notiz erscheint erst an einem bestimmten Tag',
      'Sammlung aller Notizen zum Nachlesen',
    ],
  },
  {
    id: 'frage-des-tages',
    title: 'Frage des Tages',
    short: 'Jeden Tag neu',
    icon: 'question',
    group: 'nachrichten',
    status: 'geplant',
    planned: ['Jeden Tag eine neue Frage', 'Antwort des anderen erst sichtbar, wenn beide geantwortet haben', 'Archiv aller Antworten'],
  },
  {
    id: 'doodle',
    title: 'Doodle',
    short: 'Zeichnen & senden',
    icon: 'doodle',
    group: 'nachrichten',
    status: 'geplant',
    planned: ['Mit dem Finger zeichnen', 'Zeichnung an den anderen schicken', 'Galerie aller Doodles'],
  },
  {
    id: 'sprachnachrichten',
    title: 'Sprachnachrichten',
    short: 'Kurz was sagen',
    icon: 'mic',
    group: 'nachrichten',
    status: 'geplant',
    planned: ['Aufnehmen und senden', 'Abspielen in der App', 'Push bei neuer Sprachnachricht'],
  },

  // Erinnerungen
  {
    id: 'weltkarte',
    title: 'Weltkarte',
    short: 'Unsere Orte',
    icon: 'globe',
    group: 'erinnerungen',
    status: 'fertig',
    planned: [
      'Orte auf der Karte markieren, z. B. erster Kuss oder erstes Date',
      'Pro Ort: Foto, Titel, Datum und Notiz',
      'Antippen eines Markers öffnet die Erinnerung',
    ],
  },
  {
    id: 'foto-timeline',
    title: 'Foto-Timeline',
    short: 'Momente sammeln',
    icon: 'photos',
    group: 'erinnerungen',
    status: 'fertig',
    planned: ['Fotos mit Datum und Text', 'Zeitstrahl eurer Beziehung', '„An diesem Tag vor X Jahren"'],
  },
  {
    id: 'tage-zaehler',
    title: 'Tage & Jahrestage',
    short: 'Countdowns',
    icon: 'hourglass',
    group: 'erinnerungen',
    status: 'fertig',
    planned: ['Tage zusammen', 'Countdowns zum nächsten Treffen, Urlaub oder Jahrestag', 'Meilensteine wie 1.000 Tage'],
  },
  {
    id: 'bucket-list',
    title: 'Bucket List',
    short: 'Was wir vorhaben',
    icon: 'sparkle',
    group: 'erinnerungen',
    status: 'fertig',
    planned: ['Gemeinsame Wünsche und Ziele', 'Abhaken mit Foto als Erinnerung', 'Kategorien wie Reisen oder Erlebnisse'],
  },
  {
    id: 'date-ideen',
    title: 'Date-Ideen',
    short: 'Würfeln & Wünsche',
    icon: 'dice',
    group: 'erinnerungen',
    status: 'fertig',
    planned: ['Ideen sammeln', 'Zufallsgenerator „Was machen wir heute?"', 'Wunschliste mit versteckten Geschenkideen'],
  },

  // Extras
  {
    id: 'quiz',
    title: 'Spiele & Quiz',
    short: 'Wer kennt wen besser?',
    icon: 'gamepad',
    group: 'extras',
    status: 'geplant',
    planned: ['Quiz „Wer kennt wen besser?"', 'Punktestand für beide', 'Eigene Fragen hinzufügen'],
  },
];

export const findFeature = (id: string | undefined) => features.find((f) => f.id === id);
export const findGroup = (id: FeatureGroup) => groups.find((g) => g.id === id)!;
