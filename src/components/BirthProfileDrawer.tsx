import React, { useEffect, useMemo, useState } from 'react';
import { X, RotateCcw, MapPin, Sliders } from 'lucide-react';
import { CHART_PRESETS, CITY_PRESETS, PLANET_LABELS, ZODIAC_SIGNS } from '../data/presets';
import {
  isAlbertaPermanentTime,
  parseDateStr,
  resolveHistoricalTzOffset,
} from '../engine/ephemeris';
import { BirthProfile, HouseSystem, PlanetId, ZodiacSign } from '../types/astrology';

interface BirthProfileDrawerProps {
  open: boolean;
  profile: BirthProfile;
  onClose: () => void;
  onSave: (profile: BirthProfile) => void;
}

const OVERRIDE_PLANETS: PlanetId[] = [
  'Sun',
  'Moon',
  'Ascendant',
  'Midheaven',
  'Chiron',
  'Mercury',
  'Venus',
  'Mars',
  'Saturn',
  'NorthNode',
];

export const BirthProfileDrawer: React.FC<BirthProfileDrawerProps> = ({
  open,
  profile,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<BirthProfile>(profile);
  const [cityQuery, setCityQuery] = useState('');
  const [showOverrides, setShowOverrides] = useState(Object.keys(profile.overrides).length > 0);

  useEffect(() => {
    if (open) {
      setDraft({ ...profile, overrides: { ...profile.overrides } });
      setShowOverrides(Object.keys(profile.overrides).length > 0);
    }
  }, [open, profile]);

  const resolvedOffset = useMemo(
    () =>
      resolveHistoricalTzOffset(
        draft.timeZone,
        draft.birthDate,
        draft.unknownTime ? '12:00' : draft.birthTime,
        draft.tzOffset
      ),
    [draft.timeZone, draft.birthDate, draft.birthTime, draft.unknownTime, draft.tzOffset]
  );

  const resolvedUtcPreview = useMemo(() => {
    const { year, month, day } = parseDateStr(draft.birthDate);
    const [hh, mm] = (draft.unknownTime ? '12:00' : draft.birthTime || '12:00')
      .split(':')
      .map(Number);
    const utcMs = Date.UTC(year, month - 1, day, hh || 0, mm || 0) - resolvedOffset * 3600000;
    return new Date(utcMs).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }, [draft.birthDate, draft.birthTime, draft.unknownTime, resolvedOffset]);

  if (!open) return null;

  const filteredCities = CITY_PRESETS.filter(
    (c) =>
      c.name.toLowerCase().includes(cityQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(cityQuery.toLowerCase())
  );

  const handleCitySelect = (cityName: string) => {
    const found = CITY_PRESETS.find((c) => c.name === cityName);
    if (!found) return;
    const autoOffset = resolveHistoricalTzOffset(
      found.timeZone,
      draft.birthDate,
      draft.unknownTime ? '12:00' : draft.birthTime,
      found.tzOffset
    );
    setDraft((prev) => ({
      ...prev,
      city: `${found.name}, ${found.region}`,
      lat: found.lat,
      lon: found.lon,
      tzOffset: autoOffset,
      timeZone: found.timeZone,
    }));
  };

  const handleOverrideChange = (planet: PlanetId, sign: ZodiacSign | '', degreeStr?: string) => {
    setDraft((prev) => {
      const nextOverrides = { ...prev.overrides };
      if (!sign) {
        delete nextOverrides[planet];
      } else {
        const existingDeg = nextOverrides[planet]?.degree ?? 15;
        const parsedDeg =
          degreeStr !== undefined ? Math.min(29.9, Math.max(0, Number(degreeStr) || 0)) : existingDeg;
        nextOverrides[planet] = { sign, degree: parsedDeg };
      }
      return { ...prev, overrides: nextOverrides };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...draft,
      tzOffset: resolvedOffset,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-[2px]">
      <div
        className="w-full max-w-xl bg-[#160E2C] border-l border-[#382864] h-full flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Birth Chart Profile"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#382864] bg-[#1B1233]">
          <div>
            <h2 className="text-xl font-semibold text-[#F6F3FF]">Birth Chart Details</h2>
            <p className="text-xs text-[#BEB4DE] mt-0.5">
              VSOP87 &amp; ELP2000 ephemeris with automatic historical Daylight Saving resolution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#BEB4DE] hover:text-[#F6F3FF] hover:bg-[#291C4D] transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-[#BEB4DE] mb-2">
              Saved Chart Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CHART_PRESETS.map((preset) => {
                const isSelected =
                  draft.birthDate === preset.profile.birthDate &&
                  draft.birthTime === preset.profile.birthTime &&
                  draft.city === preset.profile.city;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setDraft({ ...preset.profile, overrides: { ...preset.profile.overrides } })
                    }
                    className={`text-left p-2.5 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#B8FF3B] bg-[#241942]'
                        : 'border-[#382864] bg-[#1B1233] hover:border-[#B8FF3B]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F6F3FF] truncate">
                      {preset.label}
                    </div>
                    <div className="text-[11px] font-mono text-[#8D81B3] truncate mt-0.5">
                      {preset.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & House System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bp-name" className="block text-xs font-medium text-[#BEB4DE] mb-1.5">
                Profile Name
              </label>
              <input
                id="bp-name"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#B8FF3B]"
                placeholder="e.g. My Natal Chart"
                required
              />
            </div>

            <div>
              <label htmlFor="bp-house" className="block text-xs font-medium text-[#BEB4DE] mb-1.5">
                House System
              </label>
              <select
                id="bp-house"
                value={draft.houseSystem}
                onChange={(e) => setDraft({ ...draft, houseSystem: e.target.value as HouseSystem })}
                className="w-full px-3 py-2.5 text-sm bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#B8FF3B]"
              >
                <option value="Placidus">Placidus Houses</option>
                <option value="Whole Sign">Whole Sign Houses</option>
                <option value="Equal House">Equal Houses</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bp-date" className="block text-xs font-medium text-[#BEB4DE] mb-1.5">
                Birth Date
              </label>
              <input
                id="bp-date"
                type="date"
                value={draft.birthDate}
                onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#B8FF3B]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="bp-time" className="text-xs font-medium text-[#BEB4DE]">
                  Birth Time (Local)
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.unknownTime}
                    onChange={(e) => setDraft({ ...draft, unknownTime: e.target.checked })}
                    className="accent-[#B8FF3B]"
                  />
                  Unknown time
                </label>
              </div>
              <input
                id="bp-time"
                type="time"
                value={draft.birthTime}
                disabled={draft.unknownTime}
                onChange={(e) => setDraft({ ...draft, birthTime: e.target.value })}
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF] disabled:opacity-40 focus:outline-none focus:border-[#B8FF3B]"
              />
            </div>
          </div>

          {/* Birth Location */}
          <div className="space-y-3 pt-2 border-t border-[#382864]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#BEB4DE] inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                {draft.city}
              </span>
              <span className="text-xs font-mono tabular-nums text-[#8D81B3]">
                {draft.lat.toFixed(4)}°, {draft.lon.toFixed(4)}°
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Search cities (e.g. Red Deer)..."
                className="px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#38BDF8]"
              />
              <select
                aria-label="Select birth city"
                value=""
                onChange={(e) => handleCitySelect(e.target.value)}
                className="px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="">Choose a city ({filteredCities.length})</option>
                {filteredCities.map((c) => (
                  <option key={`${c.name}-${c.region}`} value={c.name}>
                    {c.name}, {c.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#8D81B3] mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.lat}
                  onChange={(e) => setDraft({ ...draft, lat: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8D81B3] mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.lon}
                  onChange={(e) => setDraft({ ...draft, lon: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8D81B3] mb-1">UTC Offset</label>
                <input
                  type="number"
                  step="0.5"
                  value={resolvedOffset}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tzOffset: Number(e.target.value),
                      timeZone: undefined, // manual override clears auto IANA DST
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
                />
              </div>
            </div>

            {/* Transparent Historical UTC Calculation Readout */}
            <div className="px-3 py-2 bg-[#120B24] border border-[#302157] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="text-[#BEB4DE]">
                {isAlbertaPermanentTime(draft.timeZone, draft.birthDate)
                  ? 'Alberta Time (ABT · Permanent DST): UTC-6'
                  : draft.timeZone
                  ? `Historical DST (${draft.timeZone}): UTC${resolvedOffset >= 0 ? '+' : ''}${resolvedOffset}`
                  : `Manual Offset: UTC${resolvedOffset >= 0 ? '+' : ''}${resolvedOffset}`}
              </span>
              <span className="text-[#38BDF8]">{resolvedUtcPreview}</span>
            </div>
          </div>

          {/* Optional Direct Placement Overrides */}
          <div className="pt-2 border-t border-[#382864]">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setShowOverrides(!showOverrides)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#B8FF3B] hover:underline cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showOverrides ? 'Hide Manual Placement Overrides' : 'Pin Custom Placement Overrides (Optional)'}
              </button>
              {Object.keys(draft.overrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, overrides: {} })}
                  className="inline-flex items-center gap-1 text-xs text-[#BEB4DE] hover:text-[#FF7A2F] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear overrides
                </button>
              )}
            </div>

            {showOverrides && (
              <div className="space-y-2 bg-[#120B24] border border-[#382864] p-3">
                <p className="text-xs text-[#8D81B3] mb-2">
                  All bodies calculate automatically to sub-arcminute VSOP87/ELP2000 accuracy. Pin
                  any placement only if you wish to test an alternate chart angle.
                </p>
                {OVERRIDE_PLANETS.map((planet) => {
                  const ov = draft.overrides[planet];
                  return (
                    <div key={planet} className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-xs font-medium text-[#F6F3FF]">
                        {PLANET_LABELS[planet]}
                      </span>
                      <select
                        aria-label={`${planet} sign override`}
                        value={ov?.sign ?? ''}
                        onChange={(e) =>
                          handleOverrideChange(planet, e.target.value as ZodiacSign | '')
                        }
                        className="col-span-5 px-2 py-1.5 text-xs bg-[#1B1233] border border-[#382864] text-[#F6F3FF]"
                      >
                        <option value="">Auto-calculated</option>
                        {ZODIAC_SIGNS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={29.9}
                        step={0.1}
                        disabled={!ov}
                        placeholder="Deg°"
                        value={ov ? ov.degree : ''}
                        onChange={(e) =>
                          handleOverrideChange(planet, ov?.sign ?? 'Aries', e.target.value)
                        }
                        className="col-span-3 px-2 py-1.5 text-xs font-mono tabular-nums bg-[#1B1233] border border-[#382864] text-[#F6F3FF] disabled:opacity-35"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#382864] bg-[#1B1233] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#BEB4DE] border border-[#382864] hover:text-[#F6F3FF] hover:border-[#6A58A3] transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] hover:bg-[#CAFF6B] transition-colors cursor-pointer whitespace-nowrap"
          >
            Save Birth Chart
          </button>
        </div>
      </div>
    </div>
  );
};
