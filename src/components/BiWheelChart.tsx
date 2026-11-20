import React, { useMemo } from 'react';
import { PLANET_GLYPHS, PLANET_LABELS, ZODIAC_GLYPHS, ZODIAC_SIGNS } from '../data/presets';
import { findAspect, formatDegree, getSkyPositions, normDeg } from '../engine/ephemeris';
import { NatalChart, PlanetId } from '../types/astrology';

interface BiWheelChartProps {
  natalChart: NatalChart;
  selectedDate: string;
  focusedPlanet: PlanetId | null;
  onSelectPlanet: (planet: PlanetId | null) => void;
  size?: number;
}

const CHART_PLANETS: Exclude<PlanetId, 'Ascendant' | 'Midheaven'>[] = [
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

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Spread overlapping planet glyphs cleanly so two nearby degrees never collide
function spreadAngles(
  items: { id: PlanetId; angle: number }[],
  minSepDeg = 10
): Record<PlanetId, number> {
  const sorted = [...items].sort((a, b) => a.angle - b.angle);
  const placed = sorted.map((it) => ({ ...it, display: it.angle }));

  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < placed.length; i++) {
      const curr = placed[i];
      const next = placed[(i + 1) % placed.length];
      let diff = next.display - curr.display;
      if (i === placed.length - 1) diff += 360;
      if (diff < minSepDeg) {
        const push = (minSepDeg - diff) / 2;
        curr.display = normDeg(curr.display - push);
        next.display = normDeg(next.display + push);
      }
    }
  }

  const map = {} as Record<PlanetId, number>;
  placed.forEach((p) => {
    map[p.id] = p.display;
  });
  return map;
}

export const BiWheelChart: React.FC<BiWheelChartProps> = ({
  natalChart,
  selectedDate,
  focusedPlanet,
  onSelectPlanet,
  size = 420,
}) => {
  const cx = 220;
  const cy = 220;
  const rOuter = 204;
  const rZodiacOuter = 180;
  const rZodiacInner = 152;
  const rTransitRing = 166;
  const rNatalRing = 124;
  const rAspectHub = 96;

  const ascLon = natalChart.placements.Ascendant.longitude;

  // Map ecliptic longitude to SVG angle: Ascendant sits at left horizontal (180 deg)
  // Zodiac increases counter-clockwise in astrology charts
  const lonToSvgAngle = (lon: number) => normDeg(180 - (lon - ascLon));

  const sky = useMemo(() => getSkyPositions(selectedDate, 12), [selectedDate]);

  const natalDisplayAngles = useMemo(() => {
    const items = CHART_PLANETS.map((p) => ({
      id: p as PlanetId,
      angle: lonToSvgAngle(natalChart.placements[p].longitude),
    }));
    return spreadAngles(items, 11);
  }, [natalChart, ascLon]);

  const transitDisplayAngles = useMemo(() => {
    const items = CHART_PLANETS.map((p) => ({
      id: p as PlanetId,
      angle: lonToSvgAngle(sky[p].longitude),
    }));
    return spreadAngles(items, 10);
  }, [sky, ascLon]);

  // Active transit-to-natal aspects for the selected date
  const activeAspects = useMemo(() => {
    const list: {
      transit: Exclude<PlanetId, 'Ascendant' | 'Midheaven'>;
      natal: PlanetId;
      aspect: string;
      orb: number;
      hard: boolean;
    }[] = [];

    const transitList: Exclude<PlanetId, 'Ascendant' | 'Midheaven'>[] = [
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Chiron',
    ];
    const natalList: PlanetId[] = [
      'Sun',
      'Moon',
      'Ascendant',
      'Midheaven',
      'Venus',
      'Mars',
      'Saturn',
      'Chiron',
    ];

    for (const tp of transitList) {
      for (const np of natalList) {
        const hit = findAspect(sky[tp].longitude, natalChart.placements[np].longitude, 3.0);
        if (hit) {
          const hard =
            hit.aspect === 'Conjunction' ||
            hit.aspect === 'Opposition' ||
            hit.aspect === 'Square';
          list.push({ transit: tp, natal: np, aspect: hit.aspect, orb: hit.orb, hard });
        }
      }
    }
    return list.sort((a, b) => a.orb - b.orb).slice(0, 14);
  }, [sky, natalChart]);

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        viewBox="0 0 440 440"
        style={{ maxWidth: size }}
        className="w-full h-auto select-none"
        role="img"
        aria-label={`Astrological bi-wheel comparing natal chart against sky transits for ${selectedDate}`}
      >
        {/* Outer frame */}
        <circle cx={cx} cy={cy} r={rOuter} fill="#160E2C" stroke="#382864" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rZodiacOuter} fill="#1B1233" stroke="#46337A" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rZodiacInner} fill="#140C28" stroke="#382864" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rAspectHub} fill="#120B24" stroke="#382864" strokeWidth="1" />

        {/* 12 Zodiac Sign Sectors & House Lines */}
        {ZODIAC_SIGNS.map((sign, i) => {
          const startLon = i * 30;
          const midLon = startLon + 15;
          const aStart = lonToSvgAngle(startLon);
          const aMid = lonToSvgAngle(midLon);

          const pOut = polarToCartesian(cx, cy, rZodiacOuter, aStart);
          const pIn = polarToCartesian(cx, cy, rAspectHub, aStart);
          const pGlyph = polarToCartesian(cx, cy, (rZodiacOuter + rZodiacInner) / 2, aMid);

          // 5-degree precision ticks inside zodiac ring
          const ticks = [5, 10, 15, 20, 25].map((d) => {
            const ta = lonToSvgAngle(startLon + d);
            const t1 = polarToCartesian(cx, cy, rZodiacOuter, ta);
            const t2 = polarToCartesian(cx, cy, rZodiacOuter - (d === 15 ? 5 : 3), ta);
            return { d, t1, t2 };
          });

          const isChironSign = sign === natalChart.chironSign;

          return (
            <g key={sign}>
              <line
                x1={pIn.x}
                y1={pIn.y}
                x2={pOut.x}
                y2={pOut.y}
                stroke="#33245C"
                strokeWidth="1"
              />
              {ticks.map((tk) => (
                <line
                  key={tk.d}
                  x1={tk.t1.x}
                  y1={tk.t1.y}
                  x2={tk.t2.x}
                  y2={tk.t2.y}
                  stroke="#4B3782"
                  strokeWidth="0.75"
                />
              ))}
              <text
                x={pGlyph.x}
                y={pGlyph.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fill={isChironSign ? '#B8FF3B' : '#A99CD4'}
                fontWeight={isChironSign ? '700' : '500'}
              >
                {ZODIAC_GLYPHS[sign]}
              </text>
            </g>
          );
        })}

        {/* Ascendant-Descendant Horizon Axis */}
        <line
          x1={cx - rOuter}
          y1={cy}
          x2={cx - rAspectHub}
          y2={cy}
          stroke="#B8FF3B"
          strokeWidth="1.5"
        />
        <line
          x1={cx + rAspectHub}
          y1={cy}
          x2={cx + rOuter}
          y2={cy}
          stroke="#46337A"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={cx - rZodiacInner + 14}
          y={cy - 6}
          fontSize="9"
          fill="#B8FF3B"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="600"
        >
          ASC
        </text>

        {/* True Midheaven (MC) Meridian Axis */}
        {(() => {
          const mcAngle = lonToSvgAngle(natalChart.placements.Midheaven.longitude);
          const pMcOut = polarToCartesian(cx, cy, rOuter, mcAngle);
          const pMcIn = polarToCartesian(cx, cy, rAspectHub, mcAngle);
          const pMcLabel = polarToCartesian(cx, cy, rZodiacInner - 12, mcAngle);
          return (
            <g>
              <line
                x1={pMcIn.x}
                y1={pMcIn.y}
                x2={pMcOut.x}
                y2={pMcOut.y}
                stroke="#38BDF8"
                strokeWidth="1.25"
                strokeDasharray="4 2"
              />
              <text
                x={pMcLabel.x}
                y={pMcLabel.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8.5"
                fill="#38BDF8"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
              >
                MC
              </text>
            </g>
          );
        })()}

        {/* Aspect Chord Lines inside Hub */}
        {activeAspects.map((asp, idx) => {
          const tAngle = lonToSvgAngle(sky[asp.transit].longitude);
          const nAngle = lonToSvgAngle(natalChart.placements[asp.natal].longitude);
          const p1 = polarToCartesian(cx, cy, rAspectHub - 2, tAngle);
          const p2 = polarToCartesian(cx, cy, rAspectHub - 2, nAngle);
          const isHighlighted =
            !focusedPlanet || focusedPlanet === asp.transit || focusedPlanet === asp.natal;

          const strokeColor = asp.hard ? '#FF7A2F' : asp.aspect === 'Trine' ? '#B8FF3B' : '#38BDF8';

          return (
            <line
              key={`${asp.transit}-${asp.natal}-${idx}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={strokeColor}
              strokeWidth={isHighlighted ? (asp.orb < 1 ? 1.8 : 1.1) : 0.5}
              strokeOpacity={isHighlighted ? 0.85 : 0.16}
              strokeDasharray={asp.aspect === 'Sextile' ? '3 3' : undefined}
            />
          );
        })}

        {/* Center Info Readout */}
        <circle cx={cx} cy={cy} r={34} fill="#160E2C" stroke="#382864" strokeWidth="1" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="9"
          fill="#9F92C9"
          fontFamily="IBM Plex Mono, monospace"
        >
          TRANSITS
        </text>
        <text
          x={cx}
          y={cy + 9}
          textAnchor="middle"
          fontSize="10"
          fill="#F6F3FF"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight="600"
        >
          {selectedDate.slice(5)}
        </text>

        {/* Inner Ring: Natal Placements (Lime / Sky-Blue) */}
        {CHART_PLANETS.map((planet) => {
          const placement = natalChart.placements[planet];
          const trueAngle = lonToSvgAngle(placement.longitude);
          const dispAngle = natalDisplayAngles[planet];
          const pMark = polarToCartesian(cx, cy, rAspectHub, trueAngle);
          const pGlyph = polarToCartesian(cx, cy, rNatalRing, dispAngle);
          const isSelected = focusedPlanet === planet;
          const isChiron = planet === 'Chiron';

          return (
            <g
              key={`natal-${planet}`}
              onClick={() => onSelectPlanet(isSelected ? null : planet)}
              className="cursor-pointer"
            >
              <line
                x1={pMark.x}
                y1={pMark.y}
                x2={pGlyph.x}
                y2={pGlyph.y}
                stroke={isChiron ? '#B8FF3B' : '#38BDF8'}
                strokeOpacity="0.35"
                strokeWidth="0.75"
              />
              <rect
                x={pGlyph.x - 10}
                y={pGlyph.y - 10}
                width="20"
                height="20"
                fill={isSelected ? '#B8FF3B' : isChiron ? '#253319' : '#18253E'}
                stroke={isSelected ? '#B8FF3B' : isChiron ? '#B8FF3B' : '#38BDF8'}
                strokeWidth={isSelected ? '1.5' : '1'}
              />
              <text
                x={pGlyph.x}
                y={pGlyph.y + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fill={isSelected ? '#120B24' : isChiron ? '#B8FF3B' : '#7DD3FC'}
                fontWeight="600"
              >
                {PLANET_GLYPHS[planet]}
              </text>
              <title>
                Natal {PLANET_LABELS[planet]}: {formatDegree(placement.degree)} {placement.sign} (House{' '}
                {placement.house})
              </title>
            </g>
          );
        })}

        {/* Outer Ring: Live Sky Transits (Warm Orange for Rx/Outer, Crisp White for Personal) */}
        {CHART_PLANETS.map((planet) => {
          const pos = sky[planet];
          const trueAngle = lonToSvgAngle(pos.longitude);
          const dispAngle = transitDisplayAngles[planet];
          const pTick = polarToCartesian(cx, cy, rZodiacOuter, trueAngle);
          const pGlyph = polarToCartesian(cx, cy, rTransitRing + 26, dispAngle);
          const isSelected = focusedPlanet === planet;
          const isHighlighted = pos.retrograde || planet === 'Chiron' || planet === 'Saturn' || planet === 'Uranus';

          return (
            <g
              key={`transit-${planet}`}
              onClick={() => onSelectPlanet(isSelected ? null : planet)}
              className="cursor-pointer"
            >
              <line
                x1={pTick.x}
                y1={pTick.y}
                x2={pGlyph.x}
                y2={pGlyph.y}
                stroke={isHighlighted ? '#FF7A2F' : '#8D81B3'}
                strokeOpacity="0.45"
                strokeWidth="0.75"
              />
              <rect
                x={pGlyph.x - 9.5}
                y={pGlyph.y - 9.5}
                width="19"
                height="19"
                fill={isSelected ? '#FF7A2F' : '#120B24'}
                stroke={isSelected ? '#FF7A2F' : isHighlighted ? '#FF7A2F' : '#6A58A3'}
                strokeWidth="1"
              />
              <text
                x={pGlyph.x}
                y={pGlyph.y + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10.5"
                fill={isSelected ? '#120B24' : isHighlighted ? '#FF9A5C' : '#F6F3FF'}
                fontWeight="600"
              >
                {PLANET_GLYPHS[planet]}
              </text>
              <title>
                Transit {PLANET_LABELS[planet]}: {formatDegree(pos.degree)} {pos.sign}
                {pos.retrograde ? ' (Retrograde)' : ''}
              </title>
            </g>
          );
        })}
      </svg>

      {/* Crisp Angular Legend */}
      <div className="w-full mt-3 pt-3 border-t border-[#382864] flex flex-wrap items-center justify-between gap-2 text-xs text-[#BEB4DE]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#18253E] border border-[#38BDF8] inline-block" />
            Natal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#253319] border border-[#B8FF3B] inline-block" />
            Chiron
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#120B24] border border-[#FF7A2F] inline-block" />
            Transit / Rx
          </span>
        </div>
        {focusedPlanet ? (
          <button
            type="button"
            onClick={() => onSelectPlanet(null)}
            className="text-[#B8FF3B] hover:underline font-mono cursor-pointer whitespace-nowrap"
          >
            Clear {PLANET_LABELS[focusedPlanet]} filter
          </button>
        ) : (
          <span className="font-mono text-[#8D81B3]">Click any glyph to filter</span>
        )}
      </div>
    </div>
  );
};
