import { BirthProfile, CategoryTag, CityPreset, PlanetId, ZodiacSign } from '../types/astrology';

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

export const SIGN_ELEMENT: Record<ZodiacSign, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
};

export const PLANET_GLYPHS: Record<PlanetId, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: '⚷',
  NorthNode: '☊',
  Ascendant: 'AC',
  Midheaven: 'MC',
};

export const PLANET_LABELS: Record<PlanetId, string> = {
  Sun: 'Sun',
  Moon: 'Moon',
  Mercury: 'Mercury',
  Venus: 'Venus',
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
  Pluto: 'Pluto',
  Chiron: 'Chiron',
  NorthNode: 'North Node',
  Ascendant: 'Ascendant',
  Midheaven: 'Midheaven',
};

export const HOUSE_THEMES: Record<number, { name: string; focus: string }> = {
  1: { name: '1st House', focus: 'Identity, Vitality & Self-Direction' },
  2: { name: '2nd House', focus: 'Resources, Values & Grounded Security' },
  3: { name: '3rd House', focus: 'Communication, Learning & Local Ties' },
  4: { name: '4th House', focus: 'Home, Roots & Emotional Foundations' },
  5: { name: '5th House', focus: 'Creativity, Pleasure & Self-Expression' },
  6: { name: '6th House', focus: 'Daily Craft, Rituals & Wellbeing' },
  7: { name: '7th House', focus: 'Partnerships, Contracts & Mirrors' },
  8: { name: '8th House', focus: 'Transformation, Shared Resources & Depth' },
  9: { name: '9th House', focus: 'Philosophy, Expansion & Far Horizons' },
  10: { name: '10th House', focus: 'Vocation, Legacy & Public Visibility' },
  11: { name: '11th House', focus: 'Community, Alliances & Future Vision' },
  12: { name: '12th House', focus: 'Solitude, Subconscious & Release' },
};

export const CITY_PRESETS: CityPreset[] = [
  { name: 'Red Deer', region: 'AB, Canada', lat: 52.2681, lon: -113.8112, tzOffset: -7, timeZone: 'America/Edmonton' },
  { name: 'Calgary', region: 'AB, Canada', lat: 51.0447, lon: -114.0719, tzOffset: -7, timeZone: 'America/Edmonton' },
  { name: 'Edmonton', region: 'AB, Canada', lat: 53.5461, lon: -113.4938, tzOffset: -7, timeZone: 'America/Edmonton' },
  { name: 'Vancouver', region: 'BC, Canada', lat: 49.2827, lon: -123.1207, tzOffset: -8, timeZone: 'America/Vancouver' },
  { name: 'Toronto', region: 'ON, Canada', lat: 43.6532, lon: -79.3832, tzOffset: -5, timeZone: 'America/Toronto' },
  { name: 'Montreal', region: 'QC, Canada', lat: 45.5017, lon: -73.5673, tzOffset: -5, timeZone: 'America/Toronto' },
  { name: 'San Francisco', region: 'CA, USA', lat: 37.7749, lon: -122.4194, tzOffset: -8, timeZone: 'America/Los_Angeles' },
  { name: 'Los Angeles', region: 'CA, USA', lat: 34.0522, lon: -118.2437, tzOffset: -8, timeZone: 'America/Los_Angeles' },
  { name: 'New York', region: 'NY, USA', lat: 40.7128, lon: -74.006, tzOffset: -5, timeZone: 'America/New_York' },
  { name: 'Chicago', region: 'IL, USA', lat: 41.8781, lon: -87.6298, tzOffset: -6, timeZone: 'America/Chicago' },
  { name: 'Austin', region: 'TX, USA', lat: 30.2672, lon: -97.7431, tzOffset: -6, timeZone: 'America/Chicago' },
  { name: 'Seattle', region: 'WA, USA', lat: 47.6062, lon: -122.3321, tzOffset: -8, timeZone: 'America/Los_Angeles' },
  { name: 'Denver', region: 'CO, USA', lat: 39.7392, lon: -104.9903, tzOffset: -7, timeZone: 'America/Denver' },
  { name: 'Miami', region: 'FL, USA', lat: 25.7617, lon: -80.1918, tzOffset: -5, timeZone: 'America/New_York' },
  { name: 'London', region: 'UK', lat: 51.5072, lon: -0.1276, tzOffset: 0, timeZone: 'Europe/London' },
  { name: 'Paris', region: 'France', lat: 48.8566, lon: 2.3522, tzOffset: 1, timeZone: 'Europe/Paris' },
  { name: 'Berlin', region: 'Germany', lat: 52.52, lon: 13.405, tzOffset: 1, timeZone: 'Europe/Berlin' },
  { name: 'Madrid', region: 'Spain', lat: 40.4168, lon: -3.7038, tzOffset: 1, timeZone: 'Europe/Madrid' },
  { name: 'Rome', region: 'Italy', lat: 41.9028, lon: 12.4964, tzOffset: 1, timeZone: 'Europe/Rome' },
  { name: 'Amsterdam', region: 'Netherlands', lat: 52.3676, lon: 4.9041, tzOffset: 1, timeZone: 'Europe/Amsterdam' },
  { name: 'Zurich', region: 'Switzerland', lat: 47.3769, lon: 8.5417, tzOffset: 1, timeZone: 'Europe/Zurich' },
  { name: 'Tokyo', region: 'Japan', lat: 35.6762, lon: 139.6503, tzOffset: 9, timeZone: 'Asia/Tokyo' },
  { name: 'Seoul', region: 'South Korea', lat: 37.5665, lon: 126.978, tzOffset: 9, timeZone: 'Asia/Seoul' },
  { name: 'Singapore', region: 'Singapore', lat: 1.3521, lon: 103.8198, tzOffset: 8, timeZone: 'Asia/Singapore' },
  { name: 'Sydney', region: 'Australia', lat: -33.8688, lon: 151.2093, tzOffset: 10, timeZone: 'Australia/Sydney' },
  { name: 'Melbourne', region: 'Australia', lat: -37.8136, lon: 144.9631, tzOffset: 10, timeZone: 'Australia/Melbourne' },
  { name: 'Mumbai', region: 'India', lat: 19.076, lon: 72.8777, tzOffset: 5.5, timeZone: 'Asia/Kolkata' },
  { name: 'Mexico City', region: 'Mexico', lat: 19.4326, lon: -99.1332, tzOffset: -6, timeZone: 'America/Mexico_City' },
  { name: 'São Paulo', region: 'Brazil', lat: -23.5505, lon: -46.6333, tzOffset: -3, timeZone: 'America/Sao_Paulo' },
  { name: 'Cape Town', region: 'South Africa', lat: -33.9249, lon: 18.4241, tzOffset: 2, timeZone: 'Africa/Johannesburg' },
];

export const DEFAULT_USER_TAGS: CategoryTag[] = [
  { id: 'healing', label: 'Healing & Chiron', tone: 'lime' },
  { id: 'vocation', label: 'Vocation & Focus', tone: 'sky' },
  { id: 'relationships', label: 'Relational', tone: 'sky' },
  { id: 'creativity', label: 'Creative Flow', tone: 'lime' },
  { id: 'shadow-work', label: 'Shadow & Release', tone: 'orange' },
  { id: 'rest', label: 'Rest & Grounding', tone: 'lime' },
];

// Personal natal profile: April 13, 1977, 2:30 AM MST (Red Deer, Alberta, Canada)
// Automatically resolves via VSOP87 + ELP2000 + calibrated 3D Chiron:
// Sun 23°20' Aries · Moon 25°30' Aquarius · Ascendant 16°32' Capricorn · Midheaven 22°33' Scorpio · Chiron 0°56' Taurus
export const PERSONAL_RED_DEER_PROFILE: BirthProfile = {
  name: 'My Natal Chart (Red Deer)',
  birthDate: '1977-04-13',
  birthTime: '02:30',
  unknownTime: false,
  city: 'Red Deer, AB, Canada',
  lat: 52.2681,
  lon: -113.8112,
  tzOffset: -7,
  timeZone: 'America/Edmonton',
  houseSystem: 'Placidus',
  overrides: {},
};

export const DEFAULT_BIRTH_PROFILE: BirthProfile = PERSONAL_RED_DEER_PROFILE;

export const CHART_PRESETS: { label: string; subtitle: string; profile: BirthProfile }[] = [
  {
    label: 'Personal · Red Deer (Apr 1977)',
    subtitle: 'Apr 13, 1977 · 02:30 MST · Red Deer, AB',
    profile: PERSONAL_RED_DEER_PROFILE,
  },
  {
    label: 'Aquarius Rising · Scorpio Sun',
    subtitle: 'Nov 9, 1990 · 13:15 EST · New York, NY',
    profile: {
      name: 'Aquarius Rising Chart',
      birthDate: '1990-11-09',
      birthTime: '13:15',
      unknownTime: false,
      city: 'New York, NY, USA',
      lat: 40.7128,
      lon: -74.006,
      tzOffset: -5,
      timeZone: 'America/New_York',
      houseSystem: 'Placidus',
      overrides: {},
    },
  },
  {
    label: 'Leo Moon · Pisces Sun',
    subtitle: 'Mar 6, 1995 · 21:10 GMT · London, UK',
    profile: {
      name: 'Pisces Sun Chart',
      birthDate: '1995-03-06',
      birthTime: '21:10',
      unknownTime: false,
      city: 'London, UK',
      lat: 51.5072,
      lon: -0.1276,
      tzOffset: 0,
      timeZone: 'Europe/London',
      houseSystem: 'Placidus',
      overrides: {},
    },
  },
];
