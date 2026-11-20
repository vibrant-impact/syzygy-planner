import React from 'react';
import { Sliders } from 'lucide-react';
import {
  HOUSE_THEMES,
  PLANET_GLYPHS,
  PLANET_LABELS,
  SIGN_ELEMENT,
  ZODIAC_GLYPHS,
} from '../data/presets';
import { calculateHouseFromCusps, degToSign, formatDegree, signToLon } from '../engine/ephemeris';
import { NatalChart, PlanetId } from '../types/astrology';
import { BiWheelChart } from './BiWheelChart';

interface NatalChartSectionProps {
  natalChart: NatalChart;
  selectedDate: string;
  focusedPlanet: PlanetId | null;
  onSelectPlanet: (planet: PlanetId | null) => void;
  onEditBirthProfile: () => void;
}

const ORDERED_BODIES: PlanetId[] = [
  'Ascendant',
  'Midheaven',
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'NorthNode',
];

export const NatalChartSection: React.FC<NatalChartSectionProps> = ({
  natalChart,
  selectedDate,
  focusedPlanet,
  onSelectPlanet,
  onEditBirthProfile,
}) => {
  const cusps = natalChart.houseCusps;

  // Calculate which natal houses receive the headline 2026-2028 generational shifts
  const shifts2026To2028 = [
    {
      label: 'Chiron in Taurus (Jun 2026 – 2033)',
      sign: 'Taurus' as const,
      house: calculateHouseFromCusps(signToLon('Taurus', 1), cusps),
      tone: 'lime' as const,
      note:
        natalChart.chironSign === 'Taurus'
          ? `Your 50-year Chiron Return activates your natal Chiron at ${formatDegree(
              natalChart.placements.Chiron.degree
            )} Taurus—a rare milestone of embodiment, self-worth, and somatic mastery.`
          : 'Activates grounded value healing and steady sensory repair in this house.',
    },
    {
      label: 'Saturn & Neptune in Aries (Feb 2026)',
      sign: 'Aries' as const,
      house: calculateHouseFromCusps(signToLon('Aries', 0.5), cusps),
      tone: 'orange' as const,
      note: 'Dissolves outdated forms while demanding disciplined, courageous creative leadership.',
    },
    {
      label: 'Uranus in Gemini (Apr 2026 – 2033)',
      sign: 'Gemini' as const,
      house: calculateHouseFromCusps(signToLon('Gemini', 0.5), cusps),
      tone: 'sky' as const,
      note: 'Electrifies learning, innovation, and rapid pivots across this life arena.',
    },
    {
      label: 'Saturn Enters Taurus (Apr 2028 – 2030)',
      sign: 'Taurus' as const,
      house: calculateHouseFromCusps(signToLon('Taurus', 0.5), cusps),
      tone: 'orange' as const,
      note:
        natalChart.chironSign === 'Taurus'
          ? 'Saturn joins Chiron in Taurus, anchoring your Chiron Return wisdom into durable material structure.'
          : 'Builds lasting material security, patient craftsmanship, and sustainable pacing.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#382864] pb-5">
        <div>
          <div className="text-xs font-mono tabular-nums text-[#38BDF8]">
            {natalChart.profile.birthDate} ·{' '}
            {natalChart.profile.unknownTime
              ? 'Solar Chart'
              : `${natalChart.profile.birthTime} (UTC${natalChart.resolvedTzOffset >= 0 ? '+' : ''}${natalChart.resolvedTzOffset})`}{' '}
            · {natalChart.profile.city} · {natalChart.profile.houseSystem}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F6F3FF] mt-1">
            {natalChart.profile.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#BEB4DE] mt-2">
            <span>
              Sun{' '}
              <strong className="text-[#F6F3FF]">
                {formatDegree(natalChart.placements.Sun.degree)} {natalChart.sunSign}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Moon{' '}
              <strong className="text-[#F6F3FF]">
                {formatDegree(natalChart.placements.Moon.degree)} {natalChart.moonSign}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Ascendant{' '}
              <strong className="text-[#F6F3FF]">
                {formatDegree(natalChart.placements.Ascendant.degree)} {natalChart.ascendantSign}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              MC{' '}
              <strong className="text-[#38BDF8]">
                {formatDegree(natalChart.placements.Midheaven.degree)} {natalChart.midheavenSign}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Chiron{' '}
              <strong className="text-[#B8FF3B]">
                {formatDegree(natalChart.placements.Chiron.degree)} {natalChart.chironSign}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditBirthProfile}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] hover:bg-[#CAFF6B] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Sliders className="w-3.5 h-3.5" />
          Modify Birth Details
        </button>
      </div>

      {/* Main 2-Column Bi-Wheel + Planetary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-[#1B1233] border border-[#382864] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F6F3FF]">
              Natal &amp; Transit Bi-Wheel
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#8D81B3]">{selectedDate}</span>
          </div>
          <BiWheelChart
            natalChart={natalChart}
            selectedDate={selectedDate}
            focusedPlanet={focusedPlanet}
            onSelectPlanet={onSelectPlanet}
            size={440}
          />
          <div className="pt-2 border-t border-[#302157] text-[11px] font-mono tabular-nums text-[#8D81B3] flex items-center justify-between">
            <span>Ephemeris: VSOP87 / ELP2000</span>
            <span>{natalChart.utcBirthTimestamp}</span>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#1B1233] border border-[#382864] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#382864] bg-[#160E2C] text-[11px] font-medium text-[#8D81B3]">
                  <th className="py-3 px-4">Body</th>
                  <th className="py-3 px-4">Sign &amp; Degree</th>
                  <th className="py-3 px-4">Element</th>
                  <th className="py-3 px-4">House</th>
                  <th className="py-3 px-4">Domain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C1F52] text-xs">
                {ORDERED_BODIES.map((planet) => {
                  const p = natalChart.placements[planet];
                  const isChiron = planet === 'Chiron';
                  const isFocused = focusedPlanet === planet;
                  return (
                    <tr
                      key={planet}
                      onClick={() => onSelectPlanet(isFocused ? null : planet)}
                      className={`cursor-pointer transition-colors ${
                        isFocused
                          ? 'bg-[#281C4D]'
                          : isChiron
                          ? 'bg-[#1D2421] hover:bg-[#232F25]'
                          : 'hover:bg-[#221740]'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#F6F3FF] whitespace-nowrap">
                        <span
                          className={`inline-block w-6 font-mono ${
                            isChiron ? 'text-[#B8FF3B]' : 'text-[#38BDF8]'
                          }`}
                        >
                          {PLANET_GLYPHS[planet]}
                        </span>
                        {PLANET_LABELS[planet]}
                        {p.retrograde && (
                          <span className="ml-1.5 text-[10px] font-mono text-[#FF7A2F]">Rx</span>
                        )}
                        {p.isOverride && (
                          <span className="ml-1.5 text-[10px] font-mono text-[#B8FF3B]">Pinned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[#E4DDF8] whitespace-nowrap">
                        {ZODIAC_GLYPHS[p.sign]} {p.sign} {formatDegree(p.degree)}
                      </td>
                      <td className="py-2.5 px-4 text-[#BEB4DE]">{SIGN_ELEMENT[p.sign]}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[#38BDF8]">
                        {HOUSE_THEMES[p.house].name}
                      </td>
                      <td className="py-2.5 px-4 text-[#BEB4DE]">{HOUSE_THEMES[p.house].focus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 12 House Cusps Readout */}
          <div className="bg-[#1B1233] border border-[#382864] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#F6F3FF]">
                12 House Cusps ({natalChart.profile.houseSystem})
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#8D81B3]">
                Lat {natalChart.profile.lat.toFixed(2)}° · Lon {natalChart.profile.lon.toFixed(2)}°
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-[#382864] border border-[#382864]">
              {cusps.map((lon, idx) => {
                const { sign, degree } = degToSign(lon);
                const label =
                  idx === 0
                    ? 'H1 (AC)'
                    : idx === 3
                    ? 'H4 (IC)'
                    : idx === 6
                    ? 'H7 (DC)'
                    : idx === 9
                    ? 'H10 (MC)'
                    : `House ${idx + 1}`;
                const isAngle = idx === 0 || idx === 3 || idx === 6 || idx === 9;
                return (
                  <div key={idx} className="bg-[#140C28] p-2.5">
                    <div
                      className={`text-[10px] font-mono ${
                        isAngle ? 'text-[#B8FF3B] font-semibold' : 'text-[#8D81B3]'
                      }`}
                    >
                      {label}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#F6F3FF] mt-0.5">
                      {ZODIAC_GLYPHS[sign]} {formatDegree(degree)}
                    </div>
                    <div className="text-[10px] text-[#BEB4DE]">{sign}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2026-2028 Generational Shift Map for This Chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#F6F3FF]">
          Your 2026–2028 Major Shift House Activations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {shifts2026To2028.map((s) => (
            <div key={s.label} className="bg-[#1B1233] border border-[#382864] flex flex-col">
              <div
                className={`h-[3px] w-full ${
                  s.tone === 'orange'
                    ? 'bg-[#FF7A2F]'
                    : s.tone === 'lime'
                    ? 'bg-[#B8FF3B]'
                    : 'bg-[#38BDF8]'
                }`}
              />
              <div className="p-4 space-y-2 flex-1">
                <div className="text-xs font-mono text-[#BEB4DE]">
                  {HOUSE_THEMES[s.house].name} · {ZODIAC_GLYPHS[s.sign]} {s.sign}
                </div>
                <h3 className="text-sm font-semibold text-[#F6F3FF]">{s.label}</h3>
                <div className="text-xs font-medium text-[#38BDF8]">
                  {HOUSE_THEMES[s.house].focus}
                </div>
                <p className="text-xs text-[#BEB4DE] leading-relaxed">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
