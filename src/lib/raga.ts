// Raga time theory (samay). Hindustani ragas are traditionally assigned to one of eight
// three-hour watches (prahars) of the day and night; a few are seasonal. Carnatic ragas are
// not formally time-bound, but some carry strong traditional time associations, listed here too.
export interface Raga {
  name: string;
  tradition: 'Hindustani' | 'Carnatic';
  /** Hours [start, end) in local time, 24h clock, may wrap midnight. */
  hours: [number, number];
  mood: string;
  thaat?: string;
}

export interface Prahar { label: string; hours: [number, number]; description: string }

export const PRAHARS: Prahar[] = [
  { label: 'Dawn', hours: [3, 6], description: 'Brahma muhurta: stillness before sunrise' },
  { label: 'Morning', hours: [6, 9], description: 'Sunrise: devotional and awakening' },
  { label: 'Late morning', hours: [9, 12], description: 'Bright, settled and serious' },
  { label: 'Afternoon', hours: [12, 15], description: 'Midday heat, restful' },
  { label: 'Late afternoon', hours: [15, 18], description: 'Golden hour, yearning' },
  { label: 'Evening', hours: [18, 21], description: 'Sandhya: lamps are lit, serene and devotional' },
  { label: 'Night', hours: [21, 24], description: 'Romantic and tender' },
  { label: 'Midnight', hours: [0, 3], description: 'Deep, grave and meditative' },
];

export const RAGAS: Raga[] = [
  { name: 'Lalit', tradition: 'Hindustani', hours: [3, 6], mood: 'Longing before dawn', thaat: 'Marwa' },
  { name: 'Sohini', tradition: 'Hindustani', hours: [3, 6], mood: 'Restless, bright', thaat: 'Marwa' },
  { name: 'Bhatiyar', tradition: 'Hindustani', hours: [3, 6], mood: 'Dawn devotion', thaat: 'Marwa' },
  { name: 'Bowli', tradition: 'Carnatic', hours: [4, 7], mood: 'Daybreak, auspicious' },
  { name: 'Bhoopalam', tradition: 'Carnatic', hours: [4, 7], mood: 'Awakening the deity' },
  { name: 'Bhairav', tradition: 'Hindustani', hours: [6, 9], mood: 'Solemn, devotional', thaat: 'Bhairav' },
  { name: 'Ahir Bhairav', tradition: 'Hindustani', hours: [6, 9], mood: 'Gentle, pastoral', thaat: 'Bhairav' },
  { name: 'Ramkali', tradition: 'Hindustani', hours: [6, 9], mood: 'Majestic sunrise', thaat: 'Bhairav' },
  { name: 'Malayamarutham', tradition: 'Carnatic', hours: [5, 8], mood: 'Morning breeze' },
  { name: 'Todi', tradition: 'Hindustani', hours: [9, 12], mood: 'Tender, pleading', thaat: 'Todi' },
  { name: 'Asavari', tradition: 'Hindustani', hours: [9, 12], mood: 'Renunciation', thaat: 'Asavari' },
  { name: 'Jaunpuri', tradition: 'Hindustani', hours: [9, 12], mood: 'Serious, graceful', thaat: 'Asavari' },
  { name: 'Brindavani Sarang', tradition: 'Hindustani', hours: [12, 15], mood: 'Cooling midday', thaat: 'Kafi' },
  { name: 'Shuddh Sarang', tradition: 'Hindustani', hours: [12, 15], mood: 'Calm', thaat: 'Kalyan' },
  { name: 'Madhyamavati', tradition: 'Carnatic', hours: [12, 18], mood: 'Auspicious, any time; closes concerts' },
  { name: 'Bhimpalasi', tradition: 'Hindustani', hours: [15, 18], mood: 'Longing, sweet', thaat: 'Kafi' },
  { name: 'Multani', tradition: 'Hindustani', hours: [15, 18], mood: 'Intense, contemplative', thaat: 'Todi' },
  { name: 'Patdeep', tradition: 'Hindustani', hours: [15, 18], mood: 'Romantic yearning', thaat: 'Kafi' },
  { name: 'Marwa', tradition: 'Hindustani', hours: [17, 19], mood: 'Sunset unease', thaat: 'Marwa' },
  { name: 'Puriya Dhanashri', tradition: 'Hindustani', hours: [17, 19], mood: 'Twilight devotion', thaat: 'Purvi' },
  { name: 'Yaman', tradition: 'Hindustani', hours: [18, 21], mood: 'Serene, devotional', thaat: 'Kalyan' },
  { name: 'Bhupali', tradition: 'Hindustani', hours: [18, 21], mood: 'Peaceful, open', thaat: 'Kalyan' },
  { name: 'Kalyani', tradition: 'Carnatic', hours: [18, 22], mood: 'Auspicious, majestic' },
  { name: 'Hamsadhwani', tradition: 'Carnatic', hours: [18, 22], mood: 'Joyful, invocatory' },
  { name: 'Kedar', tradition: 'Hindustani', hours: [19, 22], mood: 'Devotional, uplifting', thaat: 'Kalyan' },
  { name: 'Bihag', tradition: 'Hindustani', hours: [21, 24], mood: 'Romantic', thaat: 'Bilawal' },
  { name: 'Bageshree', tradition: 'Hindustani', hours: [21, 24], mood: 'Waiting for the beloved', thaat: 'Kafi' },
  { name: 'Desh', tradition: 'Hindustani', hours: [21, 24], mood: 'Monsoon romance', thaat: 'Khamaj' },
  { name: 'Khamaj', tradition: 'Hindustani', hours: [21, 24], mood: 'Playful, light', thaat: 'Khamaj' },
  { name: 'Neelambari', tradition: 'Carnatic', hours: [21, 24], mood: 'Lullaby, soothing' },
  { name: 'Darbari Kanada', tradition: 'Hindustani', hours: [0, 3], mood: 'Grave, regal', thaat: 'Asavari' },
  { name: 'Malkauns', tradition: 'Hindustani', hours: [0, 3], mood: 'Deep meditation', thaat: 'Bhairavi' },
  { name: 'Chandrakauns', tradition: 'Hindustani', hours: [0, 3], mood: 'Moonlit, mysterious' },
  { name: 'Adana', tradition: 'Hindustani', hours: [0, 3], mood: 'Heroic', thaat: 'Asavari' },
];

export const SEASONAL: { months: number[]; label: string; ragas: string[] }[] = [
  { months: [6, 7, 8], label: 'Monsoon', ragas: ['Miyan ki Malhar', 'Megh', 'Gaud Malhar', 'Desh'] },
  { months: [1, 2, 3], label: 'Spring (Vasant)', ragas: ['Basant', 'Bahar', 'Hindol'] },
];

const inRange = (h: number, [s, e]: [number, number]) => (s <= e ? h >= s && h < e : h >= s || h < e);

export function praharAt(date = new Date()): Prahar {
  const h = date.getHours();
  return PRAHARS.find((p) => inRange(h, p.hours))!;
}

export function ragasAt(date = new Date()): Raga[] {
  const h = date.getHours();
  return RAGAS.filter((r) => inRange(h, r.hours));
}

export function seasonalAt(date = new Date()) {
  return SEASONAL.find((s) => s.months.includes(date.getMonth()));
}

/**
 * Internet Archive query for recordings of a raga. The name must appear next to
 * "raag/raga/rag" (either order): a bare name like "yaman" matches unrelated items.
 */
export function ragaQuery(name: string): string {
  const n = name.toLowerCase();
  return [`raag ${n}`, `raga ${n}`, `rag ${n}`, `${n} raag`, `${n} raga`, `ragam ${n}`, `${n} ragam`].map((p) => `"${p}"`).join(' OR ');
}
