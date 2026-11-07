/** Kategorien der Einkaufsliste und automatische Zuordnung über eine deutsche Wortliste. */

export type ShopCategory =
  | 'obst_gemuese'
  | 'brot'
  | 'kuehlregal'
  | 'tiefkuehl'
  | 'vorrat'
  | 'getraenke'
  | 'snacks'
  | 'haushalt'
  | 'drogerie'
  | 'sonstiges';

// Reihenfolge = ungefähr der Weg durch den Supermarkt
export const SHOP_CATEGORIES: { id: ShopCategory; label: string; emoji: string }[] = [
  { id: 'obst_gemuese', label: 'Obst & Gemüse', emoji: '🥕' },
  { id: 'brot', label: 'Brot & Backwaren', emoji: '🥐' },
  { id: 'kuehlregal', label: 'Kühlregal', emoji: '🧀' },
  { id: 'tiefkuehl', label: 'Tiefkühl', emoji: '🧊' },
  { id: 'vorrat', label: 'Vorrat & Kochen', emoji: '🍝' },
  { id: 'getraenke', label: 'Getränke', emoji: '🧃' },
  { id: 'snacks', label: 'Snacks & Süßes', emoji: '🍫' },
  { id: 'haushalt', label: 'Haushalt', emoji: '🧽' },
  { id: 'drogerie', label: 'Drogerie', emoji: '🧴' },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '🛍️' },
];

export const catInfo = (id: string) => SHOP_CATEGORIES.find((c) => c.id === id) ?? SHOP_CATEGORIES[SHOP_CATEGORIES.length - 1];

const WORDS: Record<Exclude<ShopCategory, 'sonstiges'>, string[]> = {
  obst_gemuese: [
    'apfel', 'äpfel', 'banane', 'birne', 'orange', 'mandarine', 'clementine', 'zitrone', 'limette', 'traube', 'erdbeer', 'himbeer', 'heidelbeer',
    'blaubeer', 'beeren', 'kiwi', 'mango', 'ananas', 'melone', 'pfirsich', 'nektarine', 'kirsche', 'pflaume', 'avocado', 'granatapfel', 'feige',
    'tomate', 'gurke', 'paprika', 'zwiebel', 'knoblauch', 'kartoffel', 'süßkartoffel', 'möhre', 'karotte', 'salat', 'rucola', 'spinat', 'brokkoli',
    'blumenkohl', 'zucchini', 'aubergine', 'pilz', 'champignon', 'lauch', 'porree', 'sellerie', 'kohl', 'kohlrabi', 'radieschen', 'rote bete',
    'mais', 'kürbis', 'ingwer', 'chili', 'petersilie', 'basilikum', 'koriander', 'schnittlauch', 'minze', 'dill', 'frühlingszwiebel', 'spargel',
    'erbsen', 'bohnen frisch', 'feldsalat', 'eisberg', 'obst', 'gemüse', 'kräuter', 'fenchel', 'pak choi', 'rhabarber',
  ],
  brot: [
    'brot', 'brötchen', 'toast', 'baguette', 'croissant', 'brezel', 'laugen', 'ciabatta', 'wrap', 'tortilla', 'bagel', 'knäckebrot', 'zwieback',
    'kuchen', 'muffin', 'donut', 'semmel', 'vollkornbrot', 'fladenbrot', 'pita', 'naan', 'brioche', 'zimtschnecke',
  ],
  kuehlregal: [
    'milch', 'hafermilch', 'sojamilch', 'mandelmilch', 'joghurt', 'jogurt', 'quark', 'skyr', 'butter', 'margarine', 'sahne', 'schmand',
    'crème fraîche', 'creme fraiche', 'frischkäse', 'käse', 'gouda', 'mozzarella', 'feta', 'parmesan', 'halloumi', 'camembert', 'brie', 'ei', 'eier',
    'wurst', 'salami', 'schinken', 'aufschnitt', 'speck', 'bacon', 'hähnchen', 'hühnchen', 'pute', 'hack', 'hackfleisch', 'steak', 'schnitzel',
    'fleisch', 'lachs', 'fisch', 'garnelen', 'tofu', 'tempeh', 'hummus', 'pesto frisch', 'pudding', 'kefir', 'buttermilch', 'ayran', 'würstchen',
    'bratwurst', 'gnocchi', 'frische nudeln', 'tortellini', 'pizzateig', 'blätterteig', 'aufstrich',
  ],
  tiefkuehl: ['tiefkühl', 'tk ', 'pizza', 'eis', 'eiscreme', 'pommes', 'fischstäbchen', 'tk-', 'gefrier', 'spinat tk', 'erbsen tk', 'eiswürfel', 'magnum', 'ben & jerry'],
  vorrat: [
    'nudeln', 'pasta', 'spaghetti', 'penne', 'fusilli', 'reis', 'couscous', 'bulgur', 'quinoa', 'linsen', 'kichererbsen', 'bohnen', 'mehl', 'zucker',
    'salz', 'pfeffer', 'gewürz', 'paprikapulver', 'zimt', 'öl', 'olivenöl', 'essig', 'balsamico', 'senf', 'ketchup', 'mayo', 'mayonnaise',
    'sojasauce', 'sojasoße', 'tomatenmark', 'passierte tomaten', 'dosentomaten', 'tomatensoße', 'tomatensauce', 'pesto', 'brühe', 'bouillon',
    'honig', 'marmelade', 'konfitüre', 'nutella', 'erdnussbutter', 'müsli', 'haferflocken', 'cornflakes', 'granola', 'backpulver', 'hefe',
    'vanillezucker', 'kakao', 'kaffee', 'espresso', 'tee', 'kokosmilch', 'currypaste', 'curry', 'thunfisch', 'konserve', 'dose', 'mais dose',
    'oliven', 'kapern', 'gurken glas', 'sirup', 'ahornsirup', 'nüsse', 'mandeln', 'walnüsse', 'rosinen', 'chiasamen', 'leinsamen', 'speisestärke',
  ],
  getraenke: [
    'wasser', 'sprudel', 'mineralwasser', 'saft', 'orangensaft', 'apfelsaft', 'schorle', 'cola', 'fanta', 'sprite', 'limo', 'limonade', 'eistee',
    'bier', 'wein', 'rotwein', 'weißwein', 'rosé', 'sekt', 'prosecco', 'gin', 'vodka', 'wodka', 'rum', 'whisky', 'aperol', 'tonic', 'energy',
    'red bull', 'smoothie', 'mate', 'radler', 'alkoholfrei', 'kombucha',
  ],
  snacks: [
    'chips', 'schokolade', 'schoki', 'gummibärchen', 'haribo', 'kekse', 'cookies', 'popcorn', 'salzstangen', 'nachos', 'erdnüsse', 'cracker',
    'riegel', 'müsliriegel', 'bonbons', 'lakritz', 'kinder', 'praline', 'waffeln', 'flips', 'snack', 'süßigkeiten', 'studentenfutter', 'dip',
  ],
  haushalt: [
    'spülmittel', 'spüli', 'spülmaschinentabs', 'tabs', 'waschmittel', 'weichspüler', 'klopapier', 'toilettenpapier', 'küchenrolle',
    'taschentücher', 'müllbeutel', 'mülltüten', 'alufolie', 'frischhaltefolie', 'backpapier', 'schwamm', 'putzmittel', 'reiniger', 'glasreiniger',
    'allzweckreiniger', 'wc-reiniger', 'entkalker', 'kerzen', 'batterien', 'glühbirne', 'servietten', 'gefrierbeutel', 'zewa', 'spülschwamm',
    'lappen', 'staubsaugerbeutel', 'feuerzeug', 'streichhölzer', 'tüten',
  ],
  drogerie: [
    'zahnpasta', 'zahnbürste', 'zahnseide', 'shampoo', 'spülung', 'duschgel', 'seife', 'deo', 'deodorant', 'creme', 'bodylotion', 'sonnencreme',
    'rasierer', 'rasierschaum', 'tampons', 'binden', 'slipeinlagen', 'wattepads', 'wattestäbchen', 'abschminktücher', 'make-up', 'makeup',
    'mascara', 'lippenpflege', 'labello', 'nagellack', 'haargummi', 'pflaster', 'ibuprofen', 'paracetamol', 'vitamine', 'kondome', 'mundspülung',
    'handcreme', 'parfum', 'haarspray', 'gesichtsmaske',
  ],
};

// Einmal vorberechnen: alle Stichwörter, längste zuerst (spezifischer gewinnt)
const INDEX = (Object.entries(WORDS) as [ShopCategory, string[]][])
  .flatMap(([cat, ws]) => ws.map((w) => ({ w, cat })))
  .sort((a, b) => b.w.length - a.w.length);

export const memoryKey = (name: string) => name.trim().toLowerCase();

/** Kategorie raten: zuerst das gelernte Gedächtnis, dann die Wortliste. */
export function guessCategory(name: string, memory?: Map<string, string>): ShopCategory {
  const key = memoryKey(name);
  if (!key) return 'sonstiges';
  const learned = memory?.get(key);
  if (learned) return learned as ShopCategory;
  const padded = ` ${key} `;
  for (const { w, cat } of INDEX) {
    if (w.length <= 3 ? padded.includes(` ${w} `) || key === w : key.includes(w)) return cat;
  }
  return 'sonstiges';
}
