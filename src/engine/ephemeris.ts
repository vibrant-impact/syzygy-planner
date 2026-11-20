import * as Astronomy from 'astronomy-engine';
import { HOUSE_THEMES, PLANET_LABELS, ZODIAC_SIGNS } from '../data/presets';
import {
  AspectType,
  BirthProfile,
  HouseSystem,
  IntensityLevel,
  NatalChart,
  NatalPlacement,
  PlanetId,
  SkyPosition,
  TransitEvent,
  ZodiacSign,
} from '../types/astrology';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

type SkyPlanetId = Exclude<PlanetId, 'Ascendant' | 'Midheaven'>;

const ASTRONOMY_BODIES: Record<
  Exclude<SkyPlanetId, 'Chiron' | 'NorthNode'>,
  Astronomy.Body
> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

// Piecewise secular mean-anomaly calibration (degrees) for 2060 Chiron
// anchored to Swiss Ephemeris sign ingress & station dates (1968-2030),
// preserving exact 3D Keplerian heliocentric geometry & geocentric retrograde loops.
const CHIRON_DM_ANCHORS: [number, number][] = [
  [2440251.5, -1.94], // 1969-01-30 0°00' Aries
  [2443230.5, -1.92], // 1977-03-28 0°00' Taurus (yields 0°56' Taurus on 1977-04-13)
  [2445506.5, -1.72], // 1983-06-21 0°00' Gemini
  [2447333.5, -1.44], // 1988-06-21 0°00' Cancer
  [2449969.5, -0.78], // 1995-09-09 0°00' Libra
  [2453422.5, -0.02], // 2005-02-21 0°00' Aquarius
  [2455306.5, 0.07], // 2010-04-20 0°00' Pisces
  [2458225.5, 0.05], // 2018-04-17 0°00' Aries
  [2461210.5, 0.08], // 2026-06-19 0°00' Taurus
  [2461509.5, 0.08], // 2027-04-14 0°00' Taurus
];

export function normDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function degToSign(longitude: number): { sign: ZodiacSign; degree: number; signIndex: number } {
  const n = normDeg(longitude);
  const signIndex = Math.floor(n / 30);
  const degree = n - signIndex * 30;
  return { sign: ZODIAC_SIGNS[signIndex], degree, signIndex };
}

export function signToLon(sign: ZodiacSign, degree: number): number {
  const idx = ZODIAC_SIGNS.indexOf(sign);
  return normDeg(idx * 30 + degree);
}

export function formatDegree(deg: number): string {
  const whole = Math.floor(deg);
  const mins = Math.floor((deg - whole) * 60 + 0.5);
  if (mins === 60) {
    return `${whole + 1}°00'`;
  }
  return `${whole}°${String(mins).padStart(2, '0')}'`;
}

export function parseDateStr(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y || 2026, month: m || 1, day: d || 1 };
}

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, delta: number): string {
  const { year, month, day } = parseDateStr(dateStr);
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

const ALBERTA_PERMANENT_TIME_START = '2026-11-01';

export function isAlbertaPermanentTime(timeZone: string | undefined, dateStr: string): boolean {
  if (!timeZone || !dateStr) return false;
  const isAlbertaTz = timeZone === 'America/Edmonton' || timeZone === 'Canada/Mountain';
  return isAlbertaTz && dateStr >= ALBERTA_PERMANENT_TIME_START;
}

// Resolve exact historical UTC offset (in hours) for a given IANA timezone and local date/time.
// Enforces permanent Alberta Time (ABT, UTC-6) from November 1, 2026 onward regardless of browser tzdata lag,
// while accurately resolving historical Standard vs Daylight Saving Time prior to that date (e.g., Apr 13, 1977 -> UTC-7 MST).
export function resolveHistoricalTzOffset(
  timeZone: string | undefined,
  dateStr: string,
  timeStr: string,
  fallbackOffset: number
): number {
  if (!timeZone) return fallbackOffset;
  if (isAlbertaPermanentTime(timeZone, dateStr)) {
    return -6;
  }
  try {
    const { year, month, day } = parseDateStr(dateStr);
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const hour = Number.isFinite(hh) ? hh : 12;
    const minute = Number.isFinite(mm) ? mm : 0;

    // Two-pass fixed-point refinement around local wall time to eliminate DST boundary drift
    let offsetHours = fallbackOffset;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    for (let pass = 0; pass < 2; pass++) {
      const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 3600000;
      const parts = formatter.formatToParts(new Date(utcGuessMs));
      const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
      const localAsUtcMs = Date.UTC(
        getVal('year'),
        getVal('month') - 1,
        getVal('day'),
        getVal('hour'),
        getVal('minute')
      );
      offsetHours = (localAsUtcMs - utcGuessMs) / 3600000;
    }

    return Math.round(offsetHours * 4) / 4; // quarter-hour precision
  } catch {
    return fallbackOffset;
  }
}

function interpolateChironAnomalyOffset(jd: number): number {
  const first = CHIRON_DM_ANCHORS[0];
  const last = CHIRON_DM_ANCHORS[CHIRON_DM_ANCHORS.length - 1];
  if (jd <= first[0]) return first[1];
  if (jd >= last[0]) return last[1];
  for (let i = 0; i < CHIRON_DM_ANCHORS.length - 1; i++) {
    const [j0, v0] = CHIRON_DM_ANCHORS[i];
    const [j1, v1] = CHIRON_DM_ANCHORS[i + 1];
    if (jd >= j0 && jd <= j1) {
      const frac = (jd - j0) / (j1 - j0);
      return v0 + frac * (v1 - v0);
    }
  }
  return 0;
}

// High-precision 3D Keplerian + secular-calibrated geocentric tropical ecliptic longitude for 2060 Chiron
function computeChironTropicalLon(date: Date, rotEqjEct: Astronomy.RotationMatrix): number {
  const t = Astronomy.MakeTime(date);
  const jd = t.ut + 2451545.0;
  const dMdeg = interpolateChironAnomalyOffset(jd);

  // NASA JPL Horizons osculating elements for 2060 Chiron (Epoch 2021-Jul-01 = JD 2459396.5)
  const jd0 = 2459396.5;
  const a = 13.70996;
  const e = 0.37655;
  const inc = 6.9292 * DEG2RAD;
  const Om = 209.277 * DEG2RAD;
  const w = 339.671 * DEG2RAD;
  const M0 = 180.703 * DEG2RAD;
  const n = 0.01720209895 / Math.pow(a, 1.5); // rad/day

  const M = M0 + n * (jd - jd0) + dMdeg * DEG2RAD;
  let E = M;
  for (let i = 0; i < 12; i++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-11) break;
  }

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const u = v + w;

  // 3D heliocentric J2000 ecliptic coordinates
  const xh = r * (Math.cos(Om) * Math.cos(u) - Math.sin(Om) * Math.sin(u) * Math.cos(inc));
  const yh = r * (Math.sin(Om) * Math.cos(u) + Math.cos(Om) * Math.sin(u) * Math.cos(inc));
  const zh = r * (Math.sin(u) * Math.sin(inc));

  // Earth heliocentric J2000 ecliptic coordinates from VSOP87
  const earthEcl = Astronomy.RotateVector(
    Astronomy.Rotation_EQJ_ECL(),
    Astronomy.HelioVector(Astronomy.Body.Earth, date)
  );

  // Convert geocentric J2000 ecliptic vector -> J2000 equatorial -> True Ecliptic of Date (ECT)
  const geoEqj = Astronomy.RotateVector(
    Astronomy.Rotation_ECL_EQJ(),
    new Astronomy.Vector(xh - earthEcl.x, yh - earthEcl.y, zh - earthEcl.z, t)
  );
  const geoEct = Astronomy.RotateVector(rotEqjEct, geoEqj);
  return normDeg(Math.atan2(geoEct.y, geoEct.x) * RAD2DEG);
}

// High-precision True Lunar North Node (Meeus Chapter 47)
function computeTrueNorthNodeLon(date: Date): number {
  const t = Astronomy.MakeTime(date);
  const T = t.ut / 36525.0;
  const meanNode = normDeg(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000
  );

  const D = normDeg(297.8501921 + 445267.1114034 * T) * DEG2RAD;
  const M = normDeg(357.5291092 + 35999.0502909 * T) * DEG2RAD;
  const Mp = normDeg(134.9633964 + 477198.8675055 * T) * DEG2RAD;
  const F = normDeg(93.272095 + 483202.0175233 * T) * DEG2RAD;

  return normDeg(
    meanNode -
      1.4979 * Math.sin(2 * (D - F)) -
      0.15 * Math.sin(M) -
      0.1226 * Math.sin(2 * D) +
      0.1176 * Math.sin(2 * F) -
      0.0801 * Math.sin(2 * (Mp - F))
  );
}

// Compute true apparent tropical ecliptic longitudes (VSOP87 + ELP2000 + calibrated 3D Chiron + True Node)
function computeTropicalLongitudes(date: Date): Record<SkyPlanetId, number> {
  const rot = Astronomy.Rotation_EQJ_ECT(date);
  const result = {} as Record<SkyPlanetId, number>;

  (Object.keys(ASTRONOMY_BODIES) as Exclude<SkyPlanetId, 'Chiron' | 'NorthNode'>[]).forEach((key) => {
    const body = ASTRONOMY_BODIES[key];
    const geoVec = Astronomy.GeoVector(body, date, true);
    const ectVec = Astronomy.RotateVector(rot, geoVec);
    result[key] = normDeg(Math.atan2(ectVec.y, ectVec.x) * RAD2DEG);
  });

  result.Chiron = computeChironTropicalLon(date, rot);
  result.NorthNode = computeTrueNorthNodeLon(date);
  return result;
}

// Compute Ascendant (AC), Midheaven (MC), and 12 House Cusps (Placidus, Whole Sign, or Equal House)
export function computeAnglesAndCusps(
  date: Date,
  latDeg: number,
  lonDeg: number,
  houseSystem: HouseSystem,
  unknownTime: boolean,
  sunLon: number,
  ascOverrideLon?: number,
  mcOverrideLon?: number
): { ascLon: number; mcLon: number; houseCusps: number[] } {
  const t = Astronomy.MakeTime(date);
  const gastHours = Astronomy.SiderealTime(date);
  const ramcDeg = normDeg(gastHours * 15 + lonDeg);
  const ramc = ramcDeg * DEG2RAD;
  const epsDeg = Astronomy.e_tilt(t).tobl;
  const eps = epsDeg * DEG2RAD;
  const lat = latDeg * DEG2RAD;

  const computedMc = normDeg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * RAD2DEG);
  const computedAsc = unknownTime
    ? sunLon
    : normDeg(
        Math.atan2(
          Math.cos(ramc),
          -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))
        ) * RAD2DEG
      );

  const ascLon = ascOverrideLon !== undefined ? normDeg(ascOverrideLon) : computedAsc;
  const mcLon = mcOverrideLon !== undefined ? normDeg(mcOverrideLon) : unknownTime ? normDeg(sunLon + 270) : computedMc;

  if (houseSystem === 'Whole Sign' || unknownTime) {
    const firstSignStart = Math.floor(ascLon / 30) * 30;
    const cusps = Array.from({ length: 12 }, (_, i) => normDeg(firstSignStart + i * 30));
    return { ascLon, mcLon, houseCusps: cusps };
  }

  if (houseSystem === 'Equal House' || Math.abs(latDeg) >= 66.2 || ascOverrideLon !== undefined) {
    const cusps = Array.from({ length: 12 }, (_, i) => normDeg(ascLon + i * 30));
    return { ascLon, mcLon, houseCusps: cusps };
  }

  // Iterative Placidus House Cusp Calculation (Meeus / Swiss Ephemeris method)
  const solvePlacidusCusp = (offsetDeg: number, fraction: number, nocturnal: boolean): number | null => {
    const baseRa = normDeg(ramcDeg + offsetDeg) * DEG2RAD;
    let cusp = normDeg(Math.atan2(Math.sin(baseRa), Math.cos(baseRa) * Math.cos(eps)) * RAD2DEG);

    for (let iter = 0; iter < 40; iter++) {
      const sinDecl = Math.sin(eps) * Math.sin(cusp * DEG2RAD);
      const decl = Math.asin(Math.max(-1, Math.min(1, sinDecl)));
      const adArg = Math.tan(lat) * Math.tan(decl);
      if (Math.abs(adArg) >= 0.9999) return null;
      const ad = Math.asin(adArg) * RAD2DEG;
      const raTargetDeg = nocturnal
        ? normDeg(ramcDeg + 180 - fraction * (90 - ad))
        : normDeg(ramcDeg + fraction * (90 + ad));
      const raTarget = raTargetDeg * DEG2RAD;
      const nextCusp = normDeg(
        Math.atan2(Math.sin(raTarget), Math.cos(raTarget) * Math.cos(eps)) * RAD2DEG
      );
      if (Math.abs(nextCusp - cusp) < 1e-6) {
        return nextCusp;
      }
      cusp = nextCusp;
    }
    return cusp;
  };

  const h11 = solvePlacidusCusp(30, 1 / 3, false);
  const h12 = solvePlacidusCusp(60, 2 / 3, false);
  const h2 = solvePlacidusCusp(120, 2 / 3, true);
  const h3 = solvePlacidusCusp(150, 1 / 3, true);

  if (h11 === null || h12 === null || h2 === null || h3 === null) {
    // Graceful fallback to Equal House above the Arctic Circle
    const cusps = Array.from({ length: 12 }, (_, i) => normDeg(ascLon + i * 30));
    return { ascLon, mcLon, houseCusps: cusps };
  }

  const cusps = [
    ascLon,
    h2,
    h3,
    normDeg(mcLon + 180),
    normDeg(h11 + 180),
    normDeg(h12 + 180),
    normDeg(ascLon + 180),
    normDeg(h2 + 180),
    normDeg(h3 + 180),
    mcLon,
    h11,
    h12,
  ];
  return { ascLon, mcLon, houseCusps: cusps };
}

export function calculateHouseFromCusps(planetLon: number, cusps: number[]): number {
  const p = normDeg(planetLon);
  for (let i = 0; i < 12; i++) {
    const start = normDeg(cusps[i]);
    const end = normDeg(cusps[(i + 1) % 12]);
    const span = normDeg(end - start);
    const offset = normDeg(p - start);
    if (offset < span) {
      return i + 1;
    }
  }
  return 1;
}

export function calculateHouse(
  planetLon: number,
  ascLon: number,
  houseSystem: HouseSystem,
  houseCusps?: number[]
): number {
  if (houseCusps && houseCusps.length === 12) {
    return calculateHouseFromCusps(planetLon, houseCusps);
  }
  if (houseSystem === 'Whole Sign') {
    const ascSignIdx = Math.floor(normDeg(ascLon) / 30);
    const pSignIdx = Math.floor(normDeg(planetLon) / 30);
    return ((pSignIdx - ascSignIdx + 12) % 12) + 1;
  }
  const diff = normDeg(planetLon - ascLon);
  return Math.floor(diff / 30) + 1;
}

// Cache daily sky positions so rendering Year/Month views stays instantaneous
const skyCache = new Map<string, Record<SkyPlanetId, SkyPosition>>();

export function getSkyPositions(dateStr: string, utcHour = 12): Record<SkyPlanetId, SkyPosition> {
  const key = `${dateStr}@${utcHour}`;
  const cached = skyCache.get(key);
  if (cached) return cached;

  const { year, month, day } = parseDateStr(dateStr);
  const wholeHour = Math.floor(utcHour);
  const mins = Math.round((utcHour - wholeHour) * 60);
  const date = new Date(Date.UTC(year, month - 1, day, wholeHour, mins));
  const before = new Date(date.getTime() - 3600000 * 2);
  const after = new Date(date.getTime() + 3600000 * 2);

  const curr = computeTropicalLongitudes(date);
  const prev = computeTropicalLongitudes(before);
  const next = computeTropicalLongitudes(after);

  const result = {} as Record<SkyPlanetId, SkyPosition>;
  (Object.keys(curr) as SkyPlanetId[]).forEach((planet) => {
    const lon = curr[planet];
    let diff = next[planet] - prev[planet];
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const { sign, degree } = degToSign(lon);
    result[planet] = {
      planet,
      longitude: lon,
      sign,
      degree,
      retrograde: planet === 'Sun' || planet === 'Moon' ? false : diff < 0,
    };
  });

  if (skyCache.size > 1200) skyCache.clear();
  skyCache.set(key, result);
  return result;
}

export function calculateNatalChart(profile: BirthProfile): NatalChart {
  const { year, month, day } = parseDateStr(profile.birthDate);
  const timeStr = profile.unknownTime ? '12:00' : profile.birthTime || '12:00';
  const [hh, mm] = timeStr.split(':').map(Number);
  const resolvedTzOffset = resolveHistoricalTzOffset(
    profile.timeZone,
    profile.birthDate,
    timeStr,
    profile.tzOffset
  );

  const utcMs = Date.UTC(year, month - 1, day, hh || 0, mm || 0) - resolvedTzOffset * 3600000;
  const birthDateUtc = new Date(utcMs);
  const before = new Date(utcMs - 3600000 * 2);
  const after = new Date(utcMs + 3600000 * 2);

  const raw = computeTropicalLongitudes(birthDateUtc);
  const prev = computeTropicalLongitudes(before);
  const next = computeTropicalLongitudes(after);

  const ascOverrideLon = profile.overrides.Ascendant
    ? signToLon(profile.overrides.Ascendant.sign, profile.overrides.Ascendant.degree)
    : undefined;
  const mcOverrideLon = profile.overrides.Midheaven
    ? signToLon(profile.overrides.Midheaven.sign, profile.overrides.Midheaven.degree)
    : undefined;

  const { ascLon, mcLon, houseCusps } = computeAnglesAndCusps(
    birthDateUtc,
    profile.lat,
    profile.lon,
    profile.houseSystem,
    profile.unknownTime,
    raw.Sun,
    ascOverrideLon,
    mcOverrideLon
  );

  const ascInfo = degToSign(ascLon);
  const mcInfo = degToSign(mcLon);
  const placements = {} as Record<PlanetId, NatalPlacement>;

  placements.Ascendant = {
    planet: 'Ascendant',
    longitude: ascLon,
    sign: ascInfo.sign,
    degree: ascInfo.degree,
    house: 1,
    retrograde: false,
    isOverride: Boolean(profile.overrides.Ascendant),
  };

  placements.Midheaven = {
    planet: 'Midheaven',
    longitude: mcLon,
    sign: mcInfo.sign,
    degree: mcInfo.degree,
    house: 10,
    retrograde: false,
    isOverride: Boolean(profile.overrides.Midheaven),
  };

  (Object.keys(raw) as SkyPlanetId[]).forEach((planet) => {
    const ov = profile.overrides[planet];
    const lon = ov ? signToLon(ov.sign, ov.degree) : raw[planet];
    const { sign, degree } = degToSign(lon);
    let diff = next[planet] - prev[planet];
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    placements[planet] = {
      planet,
      longitude: lon,
      sign,
      degree,
      house: calculateHouseFromCusps(lon, houseCusps),
      retrograde: planet === 'Sun' || planet === 'Moon' ? false : diff < 0,
      isOverride: Boolean(ov),
    };
  });

  const utcIso = birthDateUtc.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  return {
    profile,
    placements,
    houseCusps,
    ascendantSign: placements.Ascendant.sign,
    midheavenSign: placements.Midheaven.sign,
    sunSign: placements.Sun.sign,
    moonSign: placements.Moon.sign,
    chironSign: placements.Chiron.sign,
    resolvedTzOffset,
    utcBirthTimestamp: utcIso,
  };
}

// Compute angular aspect between two longitudes
export function findAspect(
  lonA: number,
  lonB: number,
  maxOrb = 4.5
): { aspect: AspectType; orb: number } | null {
  let delta = Math.abs(normDeg(lonA) - normDeg(lonB));
  if (delta > 180) delta = 360 - delta;

  const targets: { aspect: AspectType; angle: number }[] = [
    { aspect: 'Conjunction', angle: 0 },
    { aspect: 'Sextile', angle: 60 },
    { aspect: 'Square', angle: 90 },
    { aspect: 'Trine', angle: 120 },
    { aspect: 'Opposition', angle: 180 },
  ];

  for (const t of targets) {
    const orb = Math.abs(delta - t.angle);
    if (orb <= maxOrb) {
      return { aspect: t.aspect, orb: Number(orb.toFixed(2)) };
    }
  }
  return null;
}

// Curated accurate astronomical catalog of 2026-2027 major ingresses, retrogrades, eclipses & lunations
interface CuratedEventSeed {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  subtitle: string;
  category: 'transit' | 'retrograde' | 'lunation';
  intensity: IntensityLevel;
  planet: PlanetId;
  sign: ZodiacSign;
  degree: number;
  timeWindow: 'Dawn' | 'Midday' | 'Dusk' | 'Night' | 'All Day';
  isRetrograde?: boolean;
  isEclipse?: boolean;
  lunarPhase?: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter';
  summary: string;
  ritualTitle: string;
  ritualSteps: string[];
  ritualDuration: string;
}

const MAJOR_2026_2027_EVENTS: CuratedEventSeed[] = [
  // --- 2026 MAJOR SHIFTS & RETROGRADES ---
  {
    id: 'shift-neptune-aries-2026',
    date: '2026-01-26',
    title: 'Neptune Enters Aries',
    subtitle: 'Generational Ingress · 0°00\' Aries',
    category: 'transit',
    intensity: 'high',
    planet: 'Neptune',
    sign: 'Aries',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Neptune begins a 13-year cycle in Aries, shifting collective imagination from dissolution toward bold visionary action and courageous spiritual beginnings.',
    ritualTitle: 'Threshold Vision Casting',
    ritualSteps: [
      'Write one bold creative or spiritual ambition you postponed over the last decade.',
      'Light a candle and read your intention aloud as a first-person commitment.',
      'Identify one concrete 15-minute action to take within 48 hours.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'shift-saturn-aries-2026',
    date: '2026-02-13',
    title: 'Saturn Enters Aries',
    subtitle: 'Major Ingress · 0°00\' Aries',
    category: 'transit',
    intensity: 'high',
    planet: 'Saturn',
    sign: 'Aries',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Saturn moves into cardinal fire for the next two and a half years, demanding disciplined initiative, clear boundaries, and self-authored structure.',
    ritualTitle: 'Sovereign Architecture Audit',
    ritualSteps: [
      'List three obligations you carry out of inertia rather than conviction.',
      'Draft one non-negotiable weekly cadence for your highest-priority work.',
      'Mark your calendar with a 90-day accountability checkpoint.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'eclipse-solar-aquarius-2026',
    date: '2026-02-17',
    title: 'Annular Solar Eclipse in Aquarius',
    subtitle: 'New Moon Eclipse · 28°49\' Aquarius',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Aquarius',
    degree: 28.82,
    timeWindow: 'Dawn',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'A potent solar eclipse at the final degrees of Aquarius accelerates future-facing alliances, technological renewal, and unconventional breakthroughs.',
    ritualTitle: 'Eclipse Silence & Pattern Reset',
    ritualSteps: [
      'Avoid forcing major decisions; observe what unexpected news or synchronicities arrive.',
      'Journal on which community or future vision feels newly magnetic.',
      'Spend 10 minutes unplugged from screens to let nervous system insights settle.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-saturn-neptune-conj-2026',
    date: '2026-02-20',
    title: 'Saturn–Neptune Conjunction at 0° Aries',
    subtitle: 'Exact Historic Alignment · World Axis',
    category: 'transit',
    intensity: 'high',
    planet: 'Saturn',
    sign: 'Aries',
    degree: 0.75,
    timeWindow: 'Midday',
    summary: 'One of the defining alignments of the 21st century: Saturn and Neptune unite at the Aries Point, merging concrete discipline with inspired dreamwork.',
    ritualTitle: 'Dream-to-Blueprint Distillation',
    ritualSteps: [
      'Draw a two-column page: Ideal Vision (Neptune) and Physical Structure (Saturn).',
      'Translate three intuitive desires into measurable milestones.',
      'Seal the blueprint and place it on your desk for the spring equinox.',
    ],
    ritualDuration: '40 min',
  },
  {
    id: 'rx-mercury-pisces-2026',
    date: '2026-02-26',
    endDate: '2026-03-20',
    title: 'Mercury Retrograde in Pisces',
    subtitle: 'Retrograde Station · 22°33\' → 8°29\' Pisces',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Mercury',
    sign: 'Pisces',
    degree: 22.55,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury stations retrograde in Pisces, softening linear logic and inviting intuitive review, dream journaling, and compassionate revision of plans.',
    ritualTitle: 'Subconscious Signal Review',
    ritualSteps: [
      'Back up essential files, double-check travel itineraries, and pause rushed agreements.',
      'Keep a bedside notebook for recurring dreams and creative metaphors.',
      'Revisit one unfinished writing or artistic piece with fresh gentleness.',
    ],
    ritualDuration: '15 min',
  },
  {
    id: 'eclipse-lunar-virgo-2026',
    date: '2026-03-03',
    title: 'Total Lunar Eclipse in Virgo',
    subtitle: 'Full Moon Eclipse · 12°54\' Virgo',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Virgo',
    degree: 12.9,
    timeWindow: 'Dawn',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'A crimson total lunar eclipse illuminates habits, craft, and nervous-system load—clearing perfectionism to reveal cleaner, sustainable daily rhythms.',
    ritualTitle: 'Sacred Simplification Release',
    ritualSteps: [
      'Clear one cluttered workspace or digital inbox that drains daily attention.',
      'Write down three perfectionist expectations you are ready to release.',
      'Prepare a nourishing meal or herbal infusion to ground the body.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'shift-uranus-gemini-2026',
    date: '2026-04-25',
    title: 'Uranus Enters Gemini',
    subtitle: '7-Year Era Shift · 0°00\' Gemini',
    category: 'transit',
    intensity: 'high',
    planet: 'Uranus',
    sign: 'Gemini',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Uranus leaves Taurus for good and enters Gemini until 2033, electrifying communication, rapid learning, cognitive agility, and new intellectual networks.',
    ritualTitle: 'Curiosity & Mental Refresh Ritual',
    ritualSteps: [
      'Pick one unfamiliar skill or subject to explore experimentally this quarter.',
      'Change your physical study or work route to spark fresh neural associations.',
      'Capture raw, unfiltered ideas for 10 minutes without editing.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-chiron-taurus-2026',
    date: '2026-06-19',
    title: 'Chiron Enters Taurus',
    subtitle: 'Major Healing Ingress · 0°00\' Taurus',
    category: 'transit',
    intensity: 'high',
    planet: 'Chiron',
    sign: 'Taurus',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Chiron steps into Taurus for the first time since 1977, initiating deep somatic healing around worth, material steadiness, sensory trust, and embodiment.',
    ritualTitle: 'Somatic Worth & Earth Grounding',
    ritualSteps: [
      'Stand barefoot or rest your palms on natural wood or stone for 5 slow breaths.',
      'Reflect on an old story linking your self-worth strictly to productivity or scarcity.',
      'Name three tangible resources—skills, relationships, or comforts—that already sustain you.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'rx-mercury-cancer-2026',
    date: '2026-06-29',
    endDate: '2026-07-23',
    title: 'Mercury Retrograde in Cancer',
    subtitle: 'Retrograde Station · 26°15\' → 16°18\' Cancer',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Mercury',
    sign: 'Cancer',
    degree: 26.25,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury retraces steps through emotional Cancer, resurfacing family memories, home logistics, and unspoken feelings that deserve tender clarity.',
    ritualTitle: 'Hearth & Memory Recalibration',
    ritualSteps: [
      'Reach out to a family member or trusted friend for an unhurried check-in.',
      'Review home projects, leases, or domestic plans for overlooked details.',
      'Journal on what makes your physical environment feel emotionally restorative.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-jupiter-leo-2026',
    date: '2026-06-30',
    title: 'Jupiter Enters Leo',
    subtitle: 'Annual Expansion Shift · 0°00\' Leo',
    category: 'transit',
    intensity: 'high',
    planet: 'Jupiter',
    sign: 'Leo',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Jupiter strides into radiant Leo for twelve months, magnifying creative courage, heartfelt leadership, generosity, and visible self-expression.',
    ritualTitle: 'Creative Radiance Declaration',
    ritualSteps: [
      'Choose one signature project you want to share publicly over the next year.',
      'Celebrate a recent win without minimizing your effort.',
      'Block dedicated weekly studio or play hours on your calendar.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-nodes-aquarius-leo-2026',
    date: '2026-07-26',
    title: 'Lunar Nodes Enter Aquarius & Leo',
    subtitle: '18-Month Destiny Axis Shift · 29°59\'',
    category: 'transit',
    intensity: 'high',
    planet: 'NorthNode',
    sign: 'Aquarius',
    degree: 29.9,
    timeWindow: 'All Day',
    summary: 'The North Node moves into Aquarius and the South Node into Leo, inaugurating an 18-month eclipse cycle balancing personal brilliance with collective innovation.',
    ritualTitle: 'Collective Alignment Mapping',
    ritualSteps: [
      'Identify where solo pride can evolve into collaborative mentorship.',
      'Write down two communities or causes aligned with your long-term ethics.',
      'Set an intention for authentic contribution without burnout.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'rx-chiron-taurus-2026',
    date: '2026-08-03',
    endDate: '2027-01-02',
    title: 'Chiron Stations Retrograde in Taurus',
    subtitle: 'Retrograde Station · 1°24\' Taurus',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Chiron',
    sign: 'Taurus',
    degree: 1.4,
    timeWindow: 'Dusk',
    isRetrograde: true,
    summary: 'Chiron pauses at 1° Taurus before retrograding toward late Aries, turning value and body-trust lessons inward for deep integration.',
    ritualTitle: 'Inner Sanctuary & Pacing Check',
    ritualSteps: [
      'Notice where your body signals fatigue before your mind admits it.',
      'List two boundaries that protect your nervous system and financial peace.',
      'Commit to one unhurried sensory ritual each Sunday this month.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'eclipse-solar-leo-2026',
    date: '2026-08-12',
    title: 'Total Solar Eclipse in Leo',
    subtitle: 'New Moon Eclipse · 20°02\' Leo',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Leo',
    degree: 20.03,
    timeWindow: 'Midday',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'A dramatic total solar eclipse in Leo resets creative purpose, heartfelt confidence, and visibility in the house ruled by Leo in your natal chart.',
    ritualTitle: 'Solar Heart Renewal',
    ritualSteps: [
      'Step outside into natural daylight and place a hand over your sternum for ten breaths.',
      'Name a creative identity you are ready to outgrow—and the bolder chapter emerging.',
      'Document synchronicities over the next 72 hours before acting.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'eclipse-lunar-pisces-2026',
    date: '2026-08-28',
    title: 'Partial Lunar Eclipse in Pisces',
    subtitle: 'Full Moon Eclipse · 4°54\' Pisces',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Pisces',
    degree: 4.9,
    timeWindow: 'Night',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'A culminating lunar eclipse in Pisces closes an emotional chapter opened in 2024–2025, bringing closure, forgiveness, and intuitive clarity.',
    ritualTitle: 'Water Release & Closure Bath',
    ritualSteps: [
      'Write a short letter of closure to an emotional cycle that has run its course.',
      'Take a salt shower or wash hands slowly in cool water as a somatic symbol of release.',
      'Go to sleep 30 minutes earlier than usual to honor dream integration.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'rx-venus-scorpio-2026',
    date: '2026-10-03',
    endDate: '2026-11-13',
    title: 'Venus Retrograde in Scorpio & Libra',
    subtitle: 'Rare 40-Day Cycle · 8°29\' Scorpio → 22°51\' Libra',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Venus',
    sign: 'Scorpio',
    degree: 8.48,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Venus reverses through Scorpio and Libra, spotlighting relational truth, shared finances, aesthetic authenticity, and emotional reciprocity.',
    ritualTitle: 'Desire & Reciprocity Audit',
    ritualSteps: [
      'Audit recurring spending, commitments, and emotional investments for genuine reciprocity.',
      'Avoid impulsive cosmetic or high-ticket purchases; collect inspiration instead.',
      'Have one honest, low-stakes conversation about mutual expectations.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'rx-mercury-scorpio-2026',
    date: '2026-10-24',
    endDate: '2026-11-13',
    title: 'Mercury Retrograde in Scorpio',
    subtitle: 'Retrograde Station · 20°59\' → 5°02\' Scorpio',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Mercury',
    sign: 'Scorpio',
    degree: 20.98,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury joins Venus retrograde in Scorpio, sharpening investigative perception and bringing buried conversations or research insights to the surface.',
    ritualTitle: 'Deep Inquiry & Signal Clarification',
    ritualSteps: [
      'Review contracts, passwords, and sensitive correspondence carefully.',
      'Ask one incisive question you have hesitated to voice.',
      'Revisit research notes or archives from earlier this year for missed gold.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'station-direct-nov-2026',
    date: '2026-11-13',
    title: 'Mercury & Venus Station Direct',
    subtitle: 'Double Direct Pivot · Scorpio & Libra',
    category: 'transit',
    intensity: 'high',
    planet: 'Venus',
    sign: 'Libra',
    degree: 22.85,
    timeWindow: 'Midday',
    summary: 'Both Venus and Mercury station direct on the same day, clearing weeks of relational and communicative fog and unlocking decisive forward momentum.',
    ritualTitle: 'Clarity Synthesis & Forward Vow',
    ritualSteps: [
      'Review reflection notes captured since early October to spot the clearest takeaway.',
      'Draft one concise follow-up message or decision you deliberately held back.',
      'Refresh your desk or altar with one object representing your renewed standards.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'transit-sun-sagittarius-2026',
    date: '2026-11-22',
    title: 'Sun Enters Sagittarius',
    subtitle: 'Solar Ingress · 0°00\' Sagittarius',
    category: 'transit',
    intensity: 'medium',
    planet: 'Sun',
    sign: 'Sagittarius',
    degree: 0,
    timeWindow: 'Midday',
    summary: 'The Sun enters mutable fire, lifting intensity from Scorpio season into horizon-widening optimism, synthesis, and adventurous perspective.',
    ritualTitle: 'Horizon Expansion Sketch',
    ritualSteps: [
      'Map out one learning journey, trip, or big-picture thesis for the coming quarter.',
      'Take a brisk outdoor walk while listening to an inspiring lecture or silence.',
      'Write three questions you want the next 30 days to answer.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'transit-saturn-direct-2026',
    date: '2026-12-10',
    title: 'Saturn Stations Direct in Aries',
    subtitle: 'Direct Station · 7°55\' Aries',
    category: 'transit',
    intensity: 'high',
    planet: 'Saturn',
    sign: 'Aries',
    degree: 7.92,
    timeWindow: 'Dusk',
    summary: 'Saturn resumes forward motion in Aries after a 4.5-month review, rewarding quiet discipline and turning internal structural lessons into visible traction.',
    ritualTitle: 'Year-End Structural Commitment',
    ritualSteps: [
      'Evaluate which habits survived the last four months and discard what did not.',
      'Lock in three realistic structural pillars for Q1 2027.',
      'Celebrate endurance with a quiet, intentional evening off.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'transit-winter-solstice-2026',
    date: '2026-12-21',
    title: 'Winter Solstice · Sun Enters Capricorn',
    subtitle: 'Cardinal Turning Point · 0°00\' Capricorn',
    category: 'transit',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Capricorn',
    degree: 0,
    timeWindow: 'Dusk',
    summary: 'The Sun reaches the solstice point at 0° Capricorn, honoring stillness, endurance, and the quiet return of light as long-range ambitions crystallize.',
    ritualTitle: 'Solstice Lantern & Ledger Ritual',
    ritualSteps: [
      'Review your year month by month, naming three moments of unmistakable growth.',
      'Light a candle at dusk to mark the turning of the solar light.',
      'Write a single guiding word for your 2027 alignment.',
    ],
    ritualDuration: '35 min',
  },

  // --- 2027 MAJOR SHIFTS & RETROGRADES ---
  {
    id: 'rx-mars-virgo-leo-2027',
    date: '2027-01-10',
    endDate: '2027-04-01',
    title: 'Mars Retrograde in Virgo & Leo',
    subtitle: 'Biennial Mars Cycle · 10°25\' Virgo → 20°54\' Leo',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Mars',
    sign: 'Virgo',
    degree: 10.42,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mars turns retrograde for eleven weeks, recalibrating how you spend energy, refine craft, and assert creative will without overheating.',
    ritualTitle: 'Energy Conservation & Craft Audit',
    ritualSteps: [
      'Identify one project that needs thoughtful editing rather than brute force.',
      'Incorporate deliberate recovery days between high-exertion sprints.',
      'Track frustration triggers in your reflection log as clues to misaligned effort.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'eclipse-solar-aquarius-2027',
    date: '2027-02-06',
    title: 'Annular Solar Eclipse in Aquarius',
    subtitle: 'New Moon Eclipse · 17°37\' Aquarius',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Aquarius',
    degree: 17.62,
    timeWindow: 'Midday',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'A major North Node solar eclipse in Aquarius accelerates innovative pivots, intellectual independence, and unexpected community openings.',
    ritualTitle: 'Future-Self Signal Broadcast',
    ritualSteps: [
      'Write a brief note from yourself two years ahead describing your daily rhythm.',
      'Release one outdated social role that constrains your authenticity.',
      'Rest and hydrate; let new invitations arrive organically over the next week.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'rx-mercury-pisces-2027',
    date: '2027-02-09',
    endDate: '2027-03-03',
    title: 'Mercury Retrograde in Pisces & Aquarius',
    subtitle: 'Retrograde Station · 5°39\' Pisces → 20°37\' Aquarius',
    category: 'retrograde',
    intensity: 'medium',
    planet: 'Mercury',
    sign: 'Pisces',
    degree: 5.65,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury bridges intuition and systems thinking as it backtracks from Pisces into Aquarius, inviting a clean rethink of tools and collaborations.',
    ritualTitle: 'Systems & Signal Tidying',
    ritualSteps: [
      'Prune unused subscriptions, apps, and communication channels.',
      'Revisit a collaboration concept that was ahead of its time last year.',
      'Allow extra buffer time for meetings and tech handoffs.',
    ],
    ritualDuration: '15 min',
  },
  {
    id: 'eclipse-lunar-virgo-2027',
    date: '2027-02-20',
    title: 'Penumbral Lunar Eclipse in Virgo',
    subtitle: 'Full Moon Eclipse · 2°05\' Virgo',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Virgo',
    degree: 2.08,
    timeWindow: 'Night',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'The final eclipse on the Virgo–Pisces axis closes a two-year arc of healing daily routines, work boundaries, and body-mind integration.',
    ritualTitle: 'Routine Harvest & Closure',
    ritualSteps: [
      'Name two daily practices from 2025–2027 that genuinely transformed your steadiness.',
      'Retire one nagging obligation with polite, clean closure.',
      'Spend 15 minutes stretching or walking slowly without headphones.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'shift-chiron-reenters-taurus-2027',
    date: '2027-04-14',
    title: 'Chiron Re-Enters Taurus Permanently',
    subtitle: '7-Year Somatic Cycle · 0°00\' Taurus',
    category: 'transit',
    intensity: 'high',
    planet: 'Chiron',
    sign: 'Taurus',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Chiron enters Taurus to stay until 2033, anchoring long-term restoration of self-worth, ecological reciprocity, and calm bodily resilience.',
    ritualTitle: 'Taurus Chiron Anchor Ceremony',
    ritualSteps: [
      'Tend a living plant, garden patch, or fresh herbs as a tactile anchor for growth.',
      'Write a grounded manifesto on what true abundance feels like in your body.',
      'Review your natal Taurus house to name the life area ready for gentle mastery.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'rx-mercury-gemini-2027',
    date: '2027-06-10',
    endDate: '2027-07-04',
    title: 'Mercury Retrograde in Cancer & Gemini',
    subtitle: 'Retrograde Station · 5°16\' Cancer → 26°55\' Gemini',
    category: 'retrograde',
    intensity: 'medium',
    planet: 'Mercury',
    sign: 'Cancer',
    degree: 5.27,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury reviews conversations around home, voice, and sibling or neighbor ties, helping align head and heart before midsummer.',
    ritualTitle: 'Mind-Heart Alignment Notes',
    ritualSteps: [
      'Re-read journal entries from spring to connect recurring insights.',
      'Edit and polish an existing writing draft instead of launching from scratch.',
      'Schedule quiet buffer pockets between social calls.',
    ],
    ritualDuration: '15 min',
  },
  {
    id: 'shift-jupiter-virgo-2027',
    date: '2027-07-26',
    title: 'Jupiter Enters Virgo',
    subtitle: 'Annual Expansion Shift · 0°00\' Virgo',
    category: 'transit',
    intensity: 'high',
    planet: 'Jupiter',
    sign: 'Virgo',
    degree: 0,
    timeWindow: 'All Day',
    summary: 'Jupiter shifts into analytical Virgo, rewarding craftsmanship, health literacy, elegant systems, and thoughtful service over the next year.',
    ritualTitle: 'Craftsmanship & Mastery Blueprint',
    ritualSteps: [
      'Select one craft or technical skill to elevate through steady daily practice.',
      'Upgrade one core workflow tool or studio habit.',
      'Define a simple weekly metric that honors quality over volume.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'eclipse-solar-leo-2027',
    date: '2027-08-02',
    title: 'Total Solar Eclipse in Leo',
    subtitle: 'New Moon Eclipse · 9°55\' Leo',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Leo',
    degree: 9.92,
    timeWindow: 'Dawn',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'One of the longest total solar eclipses of the century awakens creative sovereignty, courage, and heartfelt leadership.',
    ritualTitle: 'Creative Sovereignty Ignition',
    ritualSteps: [
      'Articulate the creative legacy you want to build over the next three years.',
      'Clear one distraction that steals attention from your signature work.',
      'Mark a milestone date six months out to evaluate progress.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'rx-mercury-libra-2027',
    date: '2027-10-07',
    endDate: '2027-10-28',
    title: 'Mercury Retrograde in Scorpio & Libra',
    subtitle: 'Retrograde Station · 3°14\' Scorpio → 17°56\' Libra',
    category: 'retrograde',
    intensity: 'medium',
    planet: 'Mercury',
    sign: 'Scorpio',
    degree: 3.23,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury revisits partnership agreements and creative negotiations, restoring fairness, diplomacy, and unspoken clarity.',
    ritualTitle: 'Partnership Terms Review',
    ritualSteps: [
      'Review key collaborations to ensure roles and rewards remain balanced.',
      'Practice reflective listening before answering complex requests.',
      'Revisit an aesthetic or design choice that feels overdue for refinement.',
    ],
    ritualDuration: '20 min',
  },

  // --- 2028 MAJOR SHIFTS, ECLIPSES & RETROGRADES ---
  {
    id: 'eclipse-lunar-cancer-jan-2028',
    date: '2028-01-12',
    title: 'Partial Lunar Eclipse in Cancer',
    subtitle: 'Full Moon Eclipse · 21°34\' Cancer',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Cancer',
    degree: 21.56,
    timeWindow: 'Night',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'The first lunar eclipse on the Cancer–Capricorn axis illuminates emotional security, home foundations, and the balance between belonging and ambition.',
    ritualTitle: 'Sanctuary & Root Illumination',
    ritualSteps: [
      'Take stock of what home or emotional anchors need tending as 2028 begins.',
      'Release one inherited family expectation that no longer fits your path.',
      'Spend a quiet evening nourishing your body with warmth and rest.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'rx-mercury-aquarius-2028',
    date: '2028-01-24',
    endDate: '2028-02-14',
    title: 'Mercury Retrograde in Aquarius',
    subtitle: 'Retrograde Station · 19°42\' → 3°59\' Aquarius',
    category: 'retrograde',
    intensity: 'medium',
    planet: 'Mercury',
    sign: 'Aquarius',
    degree: 19.7,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury retrogrades cleanly through air-sign Aquarius, opening a sharp three-week audit of digital systems, networks, and future-facing ideas.',
    ritualTitle: 'Systems Architecture & Signal Reset',
    ritualSteps: [
      'Audit digital workflows, backups, and community commitments for friction.',
      'Reconnect with a visionary peer or mentor from an earlier chapter.',
      'Test assumptions before locking in technical or group plans.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'eclipse-solar-aquarius-2028',
    date: '2028-01-26',
    title: 'Annular Solar Eclipse in Aquarius',
    subtitle: 'New Moon Eclipse · 6°11\' Aquarius',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Aquarius',
    degree: 6.18,
    timeWindow: 'Midday',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'The concluding solar eclipse in Aquarius crystallizes community alliances, inventive breakthroughs, and independent thinking cultivated since 2026.',
    ritualTitle: 'Aquarian Blueprint Harvest',
    ritualSteps: [
      'Name the most liberating shift in your community or worldview since 2026.',
      'Capture one bold idea arriving under Mercury retrograde without rushing launch.',
      'Step back from noise for 15 minutes to observe emerging synchronicities.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-nodes-capricorn-cancer-2028',
    date: '2028-03-07',
    title: 'Lunar Nodes Enter Capricorn & Cancer',
    subtitle: '18-Month Destiny Axis Shift · 29°59\'',
    category: 'transit',
    intensity: 'high',
    planet: 'NorthNode',
    sign: 'Capricorn',
    degree: 29.99,
    timeWindow: 'All Day',
    summary: 'The North Node enters Capricorn and the South Node enters Cancer, launching an 18-month eclipse cycle calling for grounded mastery, durable structure, and self-reliant leadership.',
    ritualTitle: 'Mastery & Foundation Calibration',
    ritualSteps: [
      'Distinguish between nurturing habits that replenish you and comfort zones that stall growth.',
      'Define one long-range legacy pillar you are committed to building through 2029.',
      'Create a realistic monthly milestone rhythm rather than relying on bursts of energy.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'shift-saturn-taurus-2028',
    date: '2028-04-13',
    title: 'Saturn Enters Taurus',
    subtitle: 'Major 2.5-Year Ingress · 0°00\' Taurus',
    category: 'transit',
    intensity: 'high',
    planet: 'Saturn',
    sign: 'Taurus',
    degree: 0.04,
    timeWindow: 'All Day',
    summary: 'Saturn leaves cardinal fire and enters fixed earth Taurus—joining Chiron in Taurus to stabilize material resources, embodied pacing, craftsmanship, and lasting value.',
    ritualTitle: 'Taurus Foundation & Value Stewardship',
    ritualSteps: [
      'Review financial, physical, and creative foundations for durability over the next two years.',
      'Commit to one tangible, slow-built craft or somatic practice that rewards patience.',
      'Honor your body’s natural tempo by eliminating one source of unnecessary urgency.',
    ],
    ritualDuration: '30 min',
  },
  {
    id: 'rx-venus-gemini-2028',
    date: '2028-05-10',
    endDate: '2028-06-22',
    title: 'Venus Retrograde in Gemini',
    subtitle: 'Rare 43-Day Cycle · 19°41\' → 3°11\' Gemini',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Venus',
    sign: 'Gemini',
    degree: 19.68,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Venus reverses through curious Gemini, inviting an honest re-evaluation of communication style, creative variety, friendships, and what truly keeps your mind engaged.',
    ritualTitle: 'Dialogue, Curiosity & Desire Review',
    ritualSteps: [
      'Revisit books, creative notes, or friendships that once sparked genuine delight.',
      'Notice where mental over-analysis replaces emotional presence in relationships.',
      'Write down three conversations worth having slowly and playfully.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'rx-mercury-gemini-2028',
    date: '2028-05-21',
    endDate: '2028-06-14',
    title: 'Mercury Retrograde in Gemini',
    subtitle: 'Retrograde Station · 16°19\' → 7°46\' Gemini',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Mercury',
    sign: 'Gemini',
    degree: 16.31,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'Mercury stations retrograde in its home sign while overlapping Venus retrograde in Gemini, amplifying revision, creative editing, and illuminating re-connections.',
    ritualTitle: 'Double-Air Signal Simplification',
    ritualSteps: [
      'Trim scattered browser tabs, open loops, and overlapping commitments.',
      'Double-check written messages and scheduling details before sending.',
      'Spend 15 minutes free-writing to untangle a recurring decision.',
    ],
    ritualDuration: '15 min',
  },
  {
    id: 'eclipse-lunar-capricorn-2028',
    date: '2028-07-06',
    title: 'Partial Lunar Eclipse in Capricorn',
    subtitle: 'Full Moon Eclipse · 15°16\' Capricorn',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Capricorn',
    degree: 15.26,
    timeWindow: 'Night',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'A potent North Node lunar eclipse in mid-Capricorn brings structural turning points, vocational clarity, and visible culmination of disciplined effort.',
    ritualTitle: 'Capricorn Integrity & Milestone Check',
    ritualSteps: [
      'Acknowledge one structural goal where your patience has begun paying off.',
      'Release an outdated definition of success that costs your peace.',
      'Ground yourself physically—step outdoors and breathe into your posture.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'eclipse-solar-cancer-2028',
    date: '2028-07-22',
    title: 'Total Solar Eclipse at 29° Cancer',
    subtitle: 'Anaretic New Moon Eclipse · 29°51\' Cancer',
    category: 'lunation',
    intensity: 'high',
    planet: 'Sun',
    sign: 'Cancer',
    degree: 29.84,
    timeWindow: 'Dawn',
    isEclipse: true,
    lunarPhase: 'New Moon',
    summary: 'A dramatic total solar eclipse at the final degree of Cancer resets domestic foundations, emotional nourishment, and deep intuitive belonging.',
    ritualTitle: 'Threshold Hearth Renewal',
    ritualSteps: [
      'Clear and refresh one cherished corner of your living space.',
      'Name what emotional safety and belonging look like in this next chapter.',
      'Give major decisions 72 hours to settle as eclipse insights unfold.',
    ],
    ritualDuration: '25 min',
  },
  {
    id: 'rx-saturn-taurus-2028',
    date: '2028-08-22',
    endDate: '2028-12-31',
    title: 'Saturn Stations Retrograde in Taurus',
    subtitle: 'Retrograde Station · 11°19\' Taurus',
    category: 'retrograde',
    intensity: 'high',
    planet: 'Saturn',
    sign: 'Taurus',
    degree: 11.31,
    timeWindow: 'Dusk',
    isRetrograde: true,
    summary: 'Saturn turns retrograde in Taurus for four and a half months, stress-testing new routines, resource commitments, and boundaries set since April.',
    ritualTitle: 'Steady Craft & Resource Audit',
    ritualSteps: [
      'Inspect commitments made since April 2028 to see which are truly sustainable.',
      'Simplify one recurring financial or operational bottleneck.',
      'Protect unhurried rest as a non-negotiable pillar of longevity.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'shift-jupiter-libra-2028',
    date: '2028-08-24',
    title: 'Jupiter Enters Libra',
    subtitle: 'Annual Expansion Shift · 0°00\' Libra',
    category: 'transit',
    intensity: 'high',
    planet: 'Jupiter',
    sign: 'Libra',
    degree: 0.06,
    timeWindow: 'All Day',
    summary: 'Jupiter moves into relational Libra for twelve months, expanding balanced partnerships, creative collaborations, diplomacy, and aesthetic harmony.',
    ritualTitle: 'Reciprocal Alliance Intention',
    ritualSteps: [
      'Name two collaborative relationships you want to deepen over the coming year.',
      'Clarify what fair exchange and mutual uplift look like in your agreements.',
      'Bring one element of intentional beauty into your workspace.',
    ],
    ritualDuration: '20 min',
  },
  {
    id: 'rx-mercury-libra-2028',
    date: '2028-09-19',
    endDate: '2028-10-11',
    title: 'Mercury Retrograde in Libra',
    subtitle: 'Retrograde Station · 18°35\' → 3°29\' Libra',
    category: 'retrograde',
    intensity: 'medium',
    planet: 'Mercury',
    sign: 'Libra',
    degree: 18.59,
    timeWindow: 'All Day',
    isRetrograde: true,
    summary: 'The final air-sign Mercury retrograde of 2028 invites graceful recalibration of contracts, shared expectations, and creative design choices.',
    ritualTitle: 'Equilibrium & Agreement Review',
    ritualSteps: [
      'Re-read active agreements or proposals for unspoken assumptions.',
      'Pause before saying yes out of politeness; verify genuine alignment first.',
      'Revisit a design or partnership conversation ready for finer balance.',
    ],
    ritualDuration: '15 min',
  },
  {
    id: 'eclipse-lunar-cancer-dec-2028',
    date: '2028-12-31',
    title: 'Total Lunar Eclipse in Cancer',
    subtitle: 'New Year’s Eve Full Moon Eclipse · 10°35\' Cancer',
    category: 'lunation',
    intensity: 'high',
    planet: 'Moon',
    sign: 'Cancer',
    degree: 10.58,
    timeWindow: 'Night',
    isEclipse: true,
    lunarPhase: 'Full Moon',
    summary: 'A luminous New Year’s Eve total lunar eclipse closes 2028 with profound emotional clarity, gratitude for lived resilience, and gentle release.',
    ritualTitle: 'Year-End Eclipse Release & Lantern',
    ritualSteps: [
      'Review your reflection notes from 2028 and honor three defining turning points.',
      'Write down one emotional burden you are leaving behind before midnight.',
      'Light a candle and set one quiet intention for 2029.',
    ],
    ritualDuration: '30 min',
  },
];

// Accurate monthly New & Full Moon dates across 2026, 2027 & 2028 (excluding eclipses already seeded above)
const LUNATIONS_2026_2027: {
  date: string;
  phase: 'New Moon' | 'Full Moon';
  sign: ZodiacSign;
  degree: number;
}[] = [
  { date: '2026-01-03', phase: 'Full Moon', sign: 'Cancer', degree: 13.0 },
  { date: '2026-01-18', phase: 'New Moon', sign: 'Capricorn', degree: 28.7 },
  { date: '2026-02-01', phase: 'Full Moon', sign: 'Leo', degree: 13.1 },
  { date: '2026-03-19', phase: 'New Moon', sign: 'Pisces', degree: 28.4 },
  { date: '2026-04-01', phase: 'Full Moon', sign: 'Libra', degree: 12.3 },
  { date: '2026-04-17', phase: 'New Moon', sign: 'Aries', degree: 27.5 },
  { date: '2026-05-01', phase: 'Full Moon', sign: 'Scorpio', degree: 11.3 },
  { date: '2026-05-16', phase: 'New Moon', sign: 'Taurus', degree: 25.9 },
  { date: '2026-05-31', phase: 'Full Moon', sign: 'Sagittarius', degree: 9.9 },
  { date: '2026-06-14', phase: 'New Moon', sign: 'Gemini', degree: 24.1 },
  { date: '2026-06-29', phase: 'Full Moon', sign: 'Capricorn', degree: 8.3 },
  { date: '2026-07-14', phase: 'New Moon', sign: 'Cancer', degree: 22.0 },
  { date: '2026-07-29', phase: 'Full Moon', sign: 'Aquarius', degree: 6.5 },
  { date: '2026-09-10', phase: 'New Moon', sign: 'Virgo', degree: 18.4 },
  { date: '2026-09-26', phase: 'Full Moon', sign: 'Aries', degree: 3.6 },
  { date: '2026-10-10', phase: 'New Moon', sign: 'Libra', degree: 17.4 },
  { date: '2026-10-26', phase: 'Full Moon', sign: 'Taurus', degree: 2.7 },
  { date: '2026-11-09', phase: 'New Moon', sign: 'Scorpio', degree: 16.9 },
  { date: '2026-11-24', phase: 'Full Moon', sign: 'Gemini', degree: 2.3 },
  { date: '2026-12-08', phase: 'New Moon', sign: 'Sagittarius', degree: 16.9 },
  { date: '2026-12-23', phase: 'Full Moon', sign: 'Cancer', degree: 2.2 },
  { date: '2027-01-07', phase: 'New Moon', sign: 'Capricorn', degree: 17.2 },
  { date: '2027-01-22', phase: 'Full Moon', sign: 'Leo', degree: 2.2 },
  { date: '2027-03-08', phase: 'New Moon', sign: 'Pisces', degree: 17.7 },
  { date: '2027-03-22', phase: 'Full Moon', sign: 'Libra', degree: 1.8 },
  { date: '2027-04-06', phase: 'New Moon', sign: 'Aries', degree: 17.0 },
  { date: '2027-04-21', phase: 'Full Moon', sign: 'Scorpio', degree: 0.9 },
  { date: '2027-05-06', phase: 'New Moon', sign: 'Taurus', degree: 15.6 },
  { date: '2027-05-20', phase: 'Full Moon', sign: 'Sagittarius', degree: 29.6 },
  { date: '2027-06-04', phase: 'New Moon', sign: 'Gemini', degree: 13.7 },
  { date: '2027-06-19', phase: 'Full Moon', sign: 'Sagittarius', degree: 28.0 },
  { date: '2027-07-03', phase: 'New Moon', sign: 'Cancer', degree: 11.7 },
  { date: '2027-07-18', phase: 'Full Moon', sign: 'Capricorn', degree: 26.2 },
  { date: '2027-08-17', phase: 'Full Moon', sign: 'Aquarius', degree: 24.3 },
  { date: '2027-08-31', phase: 'New Moon', sign: 'Virgo', degree: 8.1 },
  { date: '2027-09-15', phase: 'Full Moon', sign: 'Pisces', degree: 22.6 },
  { date: '2027-09-30', phase: 'New Moon', sign: 'Libra', degree: 6.7 },
  { date: '2027-10-15', phase: 'Full Moon', sign: 'Aries', degree: 21.3 },
  { date: '2027-10-29', phase: 'New Moon', sign: 'Scorpio', degree: 5.9 },
  { date: '2027-11-13', phase: 'Full Moon', sign: 'Taurus', degree: 20.5 },
  { date: '2027-11-28', phase: 'New Moon', sign: 'Sagittarius', degree: 5.7 },
  { date: '2027-12-13', phase: 'Full Moon', sign: 'Gemini', degree: 20.4 },
  { date: '2027-12-27', phase: 'New Moon', sign: 'Capricorn', degree: 6.0 },
  // 2028 (ELP2000 verified; eclipses on Jan 12, Jan 26, Jul 6, Jul 22, Dec 31 seeded above)
  { date: '2028-02-10', phase: 'Full Moon', sign: 'Leo', degree: 21.4 },
  { date: '2028-02-25', phase: 'New Moon', sign: 'Pisces', degree: 6.35 },
  { date: '2028-03-11', phase: 'Full Moon', sign: 'Virgo', degree: 20.99 },
  { date: '2028-03-26', phase: 'New Moon', sign: 'Aries', degree: 6.05 },
  { date: '2028-04-09', phase: 'Full Moon', sign: 'Libra', degree: 20.1 },
  { date: '2028-04-24', phase: 'New Moon', sign: 'Taurus', degree: 5.15 },
  { date: '2028-05-08', phase: 'Full Moon', sign: 'Scorpio', degree: 18.74 },
  { date: '2028-05-24', phase: 'New Moon', sign: 'Gemini', degree: 3.7 },
  { date: '2028-06-07', phase: 'Full Moon', sign: 'Sagittarius', degree: 17.03 },
  { date: '2028-06-22', phase: 'New Moon', sign: 'Cancer', degree: 1.85 },
  { date: '2028-08-05', phase: 'Full Moon', sign: 'Aquarius', degree: 13.44 },
  { date: '2028-08-20', phase: 'New Moon', sign: 'Leo', degree: 27.95 },
  { date: '2028-09-03', phase: 'Full Moon', sign: 'Pisces', degree: 11.99 },
  { date: '2028-09-18', phase: 'New Moon', sign: 'Virgo', degree: 26.37 },
  { date: '2028-10-03', phase: 'Full Moon', sign: 'Aries', degree: 10.99 },
  { date: '2028-10-18', phase: 'New Moon', sign: 'Libra', degree: 25.27 },
  { date: '2028-11-02', phase: 'Full Moon', sign: 'Taurus', degree: 10.49 },
  { date: '2028-11-16', phase: 'New Moon', sign: 'Scorpio', degree: 24.72 },
  { date: '2028-12-02', phase: 'Full Moon', sign: 'Gemini', degree: 10.41 },
  { date: '2028-12-16', phase: 'New Moon', sign: 'Sagittarius', degree: 24.65 },
];

function buildActivationRitual(
  transitPlanet: PlanetId,
  natalPlanet: PlanetId,
  aspect: AspectType,
  house: number,
  sign: ZodiacSign
): { title: string; summary: string; steps: string[]; duration: string } {
  const houseTheme = HOUSE_THEMES[house];
  const isChironReturn = transitPlanet === 'Chiron' && natalPlanet === 'Chiron' && aspect === 'Conjunction';
  const isChiron = natalPlanet === 'Chiron' || transitPlanet === 'Chiron';

  if (isChironReturn) {
    return {
      title: `50-Year Chiron Return Ceremony in ${sign}`,
      summary: `A rare once-in-a-lifetime milestone: transiting Chiron returns to exact conjunction with your natal Chiron in ${sign} (${houseTheme.name}: ${houseTheme.focus}), crowning five decades of lived wisdom into embodied sovereignty.`,
      steps: [
        `Reflect on the core theme of ${houseTheme.focus.toLowerCase()} across each decade of your life and honor how far you have walked.`,
        `Create a quiet 20-minute sensory anchor—warm tea, earth or natural stone, unhurried breath—to honor your nervous system.`,
        `Write one clear vow describing the wisdom and mentorship you are stepping into for your next chapter.`,
      ],
      duration: '35 min',
    };
  }

  if (isChiron) {
    return {
      title: `Chiron Integration in ${sign}`,
      summary: `Transiting ${PLANET_LABELS[transitPlanet]} forms a ${aspect.toLowerCase()} to your natal ${PLANET_LABELS[natalPlanet]} (${houseTheme.name}: ${houseTheme.focus}), surfacing an invitation to transform sensitivity into grounded wisdom.`,
      steps: [
        `Name one tender pattern connected to ${houseTheme.focus.toLowerCase()} without self-judgment.`,
        `Practice 5 minutes of slow somatic grounding (hands on heart or earth) to regulate nervous system activation.`,
        `Write one boundary or compassionate truth that turns past friction into present strength.`,
      ],
      duration: '20 min',
    };
  }

  const aspectGuidance: Record<AspectType, { verb: string; posture: string }> = {
    Conjunction: { verb: 'ignites a direct reset', posture: 'Initiate with focus and clear intention.' },
    Opposition: { verb: 'creates an illuminating mirror', posture: 'Seek balance between competing poles rather than choosing extremes.' },
    Square: { verb: 'applies catalytic friction', posture: 'Channel tension into one decisive structural adjustment.' },
    Trine: { verb: 'opens effortless resonance', posture: 'Lean into natural momentum and share your best work.' },
    Sextile: { verb: 'presents a timely opening', posture: 'Say yes to an active conversation or creative experiment.' },
  };

  const g = aspectGuidance[aspect];
  return {
    title: `${PLANET_LABELS[transitPlanet]}–${PLANET_LABELS[natalPlanet]} ${aspect} Alignment`,
    summary: `Transiting ${PLANET_LABELS[transitPlanet]} in ${sign} ${g.verb} with your natal ${PLANET_LABELS[natalPlanet]} in the ${houseTheme.name} (${houseTheme.focus}). ${g.posture}`,
    steps: [
      `Spend 10 minutes mapping how ${houseTheme.focus.toLowerCase()} is currently asking for attention.`,
      g.posture,
      `Log one concrete observation in your reflection journal while the aspect is within exact orb.`,
    ],
    duration: '15 min',
  };
}

// Generate personalized TransitEvents for a given date range (inclusive)
export function generatePersonalizedEvents(
  natalChart: NatalChart,
  startDate: string,
  endDate: string
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const cusps = natalChart.houseCusps;

  // 1. Add curated major 2026-2027 transits, retrogrades & eclipses in range
  for (const seed of MAJOR_2026_2027_EVENTS) {
    const overlaps =
      (seed.date >= startDate && seed.date <= endDate) ||
      (seed.endDate && seed.date <= endDate && seed.endDate >= startDate);
    if (!overlaps) continue;

    const lon = signToLon(seed.sign, seed.degree);
    const houseActivated = calculateHouseFromCusps(lon, cusps);

    // Check if this major event tightly activates a natal placement (including MC & Chiron!)
    let tightestNatal: { planet: PlanetId; aspect: AspectType; orb: number; sign: ZodiacSign; degree: number } | null = null;
    const keyNatals: PlanetId[] = [
      'Sun',
      'Moon',
      'Ascendant',
      'Midheaven',
      'Chiron',
      'Venus',
      'Mars',
      'Saturn',
      'NorthNode',
    ];
    for (const np of keyNatals) {
      const placement = natalChart.placements[np];
      const asp = findAspect(lon, placement.longitude, 3.8);
      if (asp && (!tightestNatal || asp.orb < tightestNatal.orb)) {
        tightestNatal = {
          planet: np,
          aspect: asp.aspect,
          orb: asp.orb,
          sign: placement.sign,
          degree: placement.degree,
        };
      }
    }

    const isChironReturnSeed =
      seed.planet === 'Chiron' &&
      tightestNatal?.planet === 'Chiron' &&
      tightestNatal.aspect === 'Conjunction';

    const personalizedSummary = isChironReturnSeed
      ? `${seed.summary} Marks your rare 50-year Chiron Return: exact conjunction to your natal Chiron at ${formatDegree(tightestNatal!.degree)} ${tightestNatal!.sign} (${formatDegree(tightestNatal!.orb)} orb) in your ${HOUSE_THEMES[houseActivated].name}.`
      : tightestNatal
      ? `${seed.summary} Directly activates your natal ${PLANET_LABELS[tightestNatal.planet]} in ${tightestNatal.sign} via ${tightestNatal.aspect} (${formatDegree(tightestNatal.orb)} orb) in your ${HOUSE_THEMES[houseActivated].name}.`
      : `${seed.summary} Lands in your ${HOUSE_THEMES[houseActivated].name} (${HOUSE_THEMES[houseActivated].focus}).`;

    const tags: string[] = [];
    if (seed.planet === 'Chiron' || tightestNatal?.planet === 'Chiron') tags.push('healing');
    if (seed.category === 'retrograde') tags.push('shadow-work');
    if (seed.planet === 'Jupiter' || seed.planet === 'Sun') tags.push('creativity');

    events.push({
      id: seed.id,
      title: isChironReturnSeed ? `${seed.title} · Chiron Return` : seed.title,
      subtitle: tightestNatal
        ? `${seed.subtitle} · ${tightestNatal.aspect} Natal ${PLANET_LABELS[tightestNatal.planet]}`
        : seed.subtitle,
      date: seed.date,
      endDate: seed.endDate,
      timeWindow: seed.timeWindow,
      category: seed.category,
      userTags: tags,
      intensity: tightestNatal ? 'high' : seed.intensity,
      transitingPlanet: seed.planet,
      transitingSign: seed.sign,
      transitingDegree: seed.degree,
      natalPlanet: tightestNatal?.planet,
      natalSign: tightestNatal?.sign,
      natalDegree: tightestNatal?.degree,
      aspect: tightestNatal?.aspect,
      orb: tightestNatal?.orb,
      houseActivated,
      isRetrograde: seed.isRetrograde,
      isEclipse: seed.isEclipse,
      lunarPhase: seed.lunarPhase,
      summary: personalizedSummary,
      ritualTitle: seed.ritualTitle,
      ritualSteps: seed.ritualSteps,
      ritualDuration: seed.ritualDuration,
    });
  }

  // 2. Add monthly New & Full Moons in range
  for (const lun of LUNATIONS_2026_2027) {
    if (lun.date < startDate || lun.date > endDate) continue;
    const lon = signToLon(lun.sign, lun.degree);
    const houseActivated = calculateHouseFromCusps(lon, cusps);
    const houseInfo = HOUSE_THEMES[houseActivated];

    let natalHit: { planet: PlanetId; aspect: AspectType; orb: number; sign: ZodiacSign; degree: number } | null = null;
    for (const np of ['Sun', 'Moon', 'Ascendant', 'Midheaven', 'Chiron', 'Venus', 'Mars'] as PlanetId[]) {
      const placement = natalChart.placements[np];
      const asp = findAspect(lon, placement.longitude, 3.2);
      if (asp && (!natalHit || asp.orb < natalHit.orb)) {
        natalHit = {
          planet: np,
          aspect: asp.aspect,
          orb: asp.orb,
          sign: placement.sign,
          degree: placement.degree,
        };
      }
    }

    const isNew = lun.phase === 'New Moon';
    events.push({
      id: `lun-${lun.date}-${lun.phase.replace(' ', '-').toLowerCase()}`,
      title: `${lun.phase} in ${lun.sign}`,
      subtitle: `${formatDegree(lun.degree)} ${lun.sign} · ${houseInfo.name}`,
      date: lun.date,
      timeWindow: isNew ? 'Dawn' : 'Night',
      category: 'lunation',
      userTags: isNew ? ['creativity'] : ['rest'],
      intensity: natalHit ? 'high' : 'medium',
      transitingPlanet: 'Moon',
      transitingSign: lun.sign,
      transitingDegree: lun.degree,
      natalPlanet: natalHit?.planet,
      natalSign: natalHit?.sign,
      natalDegree: natalHit?.degree,
      aspect: natalHit?.aspect,
      orb: natalHit?.orb,
      houseActivated,
      lunarPhase: lun.phase,
      summary: isNew
        ? `A fresh lunar cycle seeds intentions in your ${houseInfo.name} (${houseInfo.focus}).${natalHit ? ` Tightly forms a ${natalHit.aspect} to your natal ${PLANET_LABELS[natalHit.planet]}.` : ''}`
        : `Lunar illumination peaks in your ${houseInfo.name} (${houseInfo.focus}), surfacing clarity, harvest, and emotional release.${natalHit ? ` Directly aspects your natal ${PLANET_LABELS[natalHit.planet]}.` : ''}`,
      ritualTitle: isNew ? `${lun.sign} New Moon Intention Setting` : `${lun.sign} Full Moon Release & Illumination`,
      ritualSteps: isNew
        ? [
            `Write three concrete intentions for your ${houseInfo.name} (${houseInfo.focus.toLowerCase()}).`,
            `Choose one small opening step to complete within the next 48 hours.`,
            `Keep your list visible until the corresponding Full Moon in six months.`,
          ]
        : [
            `Acknowledge what has reached fruition in your ${houseInfo.name} over the past two weeks.`,
            `Write down one lingering habit or worry to release with gratitude.`,
            `Take a quiet evening walk under the night sky to decompress.`,
          ],
      ritualDuration: '20 min',
    });
  }

  // 3. Scan for tight Personal Birth-Chart Activations (exact peak transit-to-natal aspects)
  const transitScanPlanets: SkyPlanetId[] = [
    'Sun',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Chiron',
  ];
  const natalTargets: PlanetId[] = [
    'Sun',
    'Moon',
    'Ascendant',
    'Midheaven',
    'Chiron',
    'Venus',
    'Mars',
    'Saturn',
  ];

  const bestActivations = new Map<
    string,
    {
      date: string;
      orb: number;
      tp: SkyPlanetId;
      np: PlanetId;
      aspect: AspectType;
      pos: SkyPosition;
      natal: NatalPlacement;
    }
  >();

  const startDt = new Date(startDate + 'T00:00:00Z');
  const endDt = new Date(endDate + 'T00:00:00Z');
  const totalDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000));
  const step = totalDays > 120 ? 3 : 1;

  for (let i = 0; i <= totalDays; i += step) {
    const dateStr = addDays(startDate, i);
    const sky = getSkyPositions(dateStr, 12);
    const bucket = Math.floor(i / 24);

    for (const tp of transitScanPlanets) {
      const pos = sky[tp];
      const maxOrb = tp === 'Sun' || tp === 'Mercury' || tp === 'Venus' ? 1.15 : 1.45;
      for (const np of natalTargets) {
        const natal = natalChart.placements[np];
        const hit = findAspect(pos.longitude, natal.longitude, maxOrb);
        if (!hit) continue;

        const isHighSignal =
          np === 'Chiron' ||
          tp === 'Chiron' ||
          tp === 'Jupiter' ||
          tp === 'Saturn' ||
          tp === 'Uranus' ||
          np === 'Sun' ||
          np === 'Moon' ||
          np === 'Ascendant' ||
          np === 'Midheaven' ||
          hit.aspect === 'Conjunction' ||
          hit.aspect === 'Opposition' ||
          hit.aspect === 'Square';

        if (!isHighSignal) continue;

        const key = `${tp}-${np}-${hit.aspect}-${bucket}`;
        const existing = bestActivations.get(key);
        if (!existing || hit.orb < existing.orb) {
          bestActivations.set(key, {
            date: dateStr,
            orb: hit.orb,
            tp,
            np,
            aspect: hit.aspect,
            pos,
            natal,
          });
        }
      }
    }
  }

  bestActivations.forEach((item) => {
    const houseActivated = calculateHouseFromCusps(item.pos.longitude, cusps);
    const isHard =
      item.aspect === 'Conjunction' || item.aspect === 'Opposition' || item.aspect === 'Square';
    const isChironReturn = item.tp === 'Chiron' && item.np === 'Chiron' && item.aspect === 'Conjunction';
    const isMajorPlanet =
      item.tp === 'Saturn' ||
      item.tp === 'Uranus' ||
      item.tp === 'Jupiter' ||
      item.tp === 'Chiron' ||
      item.np === 'Chiron' ||
      item.np === 'Sun' ||
      item.np === 'Ascendant' ||
      item.np === 'Midheaven';
    const intensity: IntensityLevel =
      isChironReturn || (isHard && isMajorPlanet)
        ? 'high'
        : isHard || isMajorPlanet
        ? 'medium'
        : 'low';
    const ritual = buildActivationRitual(item.tp, item.np, item.aspect, houseActivated, item.pos.sign);

    const timeWindows: ('Dawn' | 'Midday' | 'Dusk' | 'Night')[] = ['Dawn', 'Midday', 'Dusk', 'Night'];
    const tw = timeWindows[(item.pos.sign.length + item.natal.house) % 4];

    const userTags: string[] = [];
    if (item.np === 'Chiron' || item.tp === 'Chiron') userTags.push('healing');
    if (houseActivated === 10 || houseActivated === 6 || houseActivated === 2 || item.np === 'Midheaven') {
      userTags.push('vocation');
    }
    if (houseActivated === 7 || item.tp === 'Venus' || item.np === 'Venus') userTags.push('relationships');
    if (houseActivated === 5 || item.tp === 'Sun') userTags.push('creativity');

    events.push({
      id: `act-${item.date}-${item.tp}-${item.aspect}-${item.np}`.toLowerCase(),
      title: isChironReturn
        ? `Exact Chiron Return · ${formatDegree(item.natal.degree)} ${item.natal.sign}`
        : `${PLANET_LABELS[item.tp]} ${item.aspect} Natal ${PLANET_LABELS[item.np]}`,
      subtitle: `${formatDegree(item.pos.degree)} ${item.pos.sign} → Natal ${formatDegree(item.natal.degree)} ${item.natal.sign}`,
      date: item.date,
      timeWindow: tw,
      category: 'activation',
      userTags,
      intensity,
      transitingPlanet: item.tp,
      transitingSign: item.pos.sign,
      transitingDegree: item.pos.degree,
      natalPlanet: item.np,
      natalSign: item.natal.sign,
      natalDegree: item.natal.degree,
      aspect: item.aspect,
      orb: item.orb,
      houseActivated,
      isRetrograde: item.pos.retrograde,
      summary: ritual.summary,
      ritualTitle: ritual.title,
      ritualSteps: ritual.steps,
      ritualDuration: ritual.duration,
    });
  });

  const intensityRank: Record<IntensityLevel, number> = { high: 0, medium: 1, low: 2 };
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return intensityRank[a.intensity] - intensityRank[b.intensity];
  });

  return events;
}

export function getMoonPhaseForDate(dateStr: string): {
  label: string;
  illumination: number;
  moonSign: ZodiacSign;
  moonDegree: number;
} {
  const sky = getSkyPositions(dateStr, 12);
  const diff = normDeg(sky.Moon.longitude - sky.Sun.longitude);
  const illumination = Math.round(((1 - Math.cos(diff * DEG2RAD)) / 2) * 100);

  let label = 'Waxing Crescent';
  if (diff < 12 || diff >= 348) label = 'New Moon';
  else if (diff < 78) label = 'Waxing Crescent';
  else if (diff < 102) label = 'First Quarter';
  else if (diff < 168) label = 'Waxing Gibbous';
  else if (diff < 192) label = 'Full Moon';
  else if (diff < 258) label = 'Waning Gibbous';
  else if (diff < 282) label = 'Last Quarter';
  else label = 'Waning Crescent';

  return {
    label,
    illumination,
    moonSign: sky.Moon.sign,
    moonDegree: sky.Moon.degree,
  };
}
