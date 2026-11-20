export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type PlanetId =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Chiron'
  | 'NorthNode'
  | 'Ascendant'
  | 'Midheaven';

export type AspectType = 'Conjunction' | 'Opposition' | 'Square' | 'Trine' | 'Sextile';

export type EventCategoryId =
  | 'transit'
  | 'retrograde'
  | 'lunation'
  | 'activation'
  | 'custom';

export type IntensityLevel = 'high' | 'medium' | 'low';

export type RitualStatus = 'uncommitted' | 'committed' | 'completed';

export type ResonanceTag = 'Grounded' | 'Activated' | 'Breakthrough' | 'Tender' | 'Clear';

export type PlannerView = 'day' | 'week' | 'month' | 'year';

export type ActiveSection = 'planner' | 'chart' | 'rituals' | 'reflections';

export type HouseSystem = 'Placidus' | 'Whole Sign' | 'Equal House';

export interface CityPreset {
  name: string;
  region: string;
  lat: number;
  lon: number;
  tzOffset: number;
  timeZone: string;
}

export interface ManualPlacementOverride {
  sign: ZodiacSign;
  degree: number;
}

export interface BirthProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  unknownTime: boolean;
  city: string;
  lat: number;
  lon: number;
  tzOffset: number;
  timeZone?: string;
  houseSystem: HouseSystem;
  overrides: Partial<Record<PlanetId, ManualPlacementOverride>>;
}

export interface NatalPlacement {
  planet: PlanetId;
  longitude: number; // 0..360
  sign: ZodiacSign;
  degree: number; // 0..29.99
  house: number; // 1..12
  retrograde: boolean;
  isOverride?: boolean;
}

export interface NatalChart {
  profile: BirthProfile;
  placements: Record<PlanetId, NatalPlacement>;
  houseCusps: number[]; // 12 longitudes (index 0 = House 1 / Ascendant, index 9 = House 10 / MC)
  ascendantSign: ZodiacSign;
  midheavenSign: ZodiacSign;
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  chironSign: ZodiacSign;
  resolvedTzOffset: number;
  utcBirthTimestamp: string;
}

export interface SkyPosition {
  planet: PlanetId;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  retrograde: boolean;
}

export interface CategoryTag {
  id: string;
  label: string;
  tone: 'lime' | 'sky' | 'orange';
}

export interface TransitEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for spans like retrogrades
  timeWindow: 'Dawn' | 'Midday' | 'Dusk' | 'Night' | 'All Day';
  category: EventCategoryId;
  userTags: string[];
  intensity: IntensityLevel;
  transitingPlanet: PlanetId;
  transitingSign: ZodiacSign;
  transitingDegree: number;
  natalPlanet?: PlanetId;
  natalSign?: ZodiacSign;
  natalDegree?: number;
  aspect?: AspectType;
  orb?: number;
  houseActivated: number;
  isRetrograde?: boolean;
  isEclipse?: boolean;
  lunarPhase?: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter';
  summary: string;
  ritualTitle: string;
  ritualSteps: string[];
  ritualDuration: string;
  isCustom?: boolean;
}

export interface RitualCommitment {
  eventId: string;
  status: RitualStatus;
  scheduledTime: string;
  intention: string;
  completedSteps: number[];
  updatedAt: string;
}

export interface ReflectionNote {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  category: EventCategoryId;
  planet: PlanetId;
  content: string;
  resonance: ResonanceTag;
  createdAt: string;
}
