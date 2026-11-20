import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Flame,
  Moon,
  RotateCcw,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { HOUSE_THEMES, PLANET_GLYPHS, PLANET_LABELS, ZODIAC_GLYPHS } from '../data/presets';
import {
  addDays,
  formatDegree,
  getMoonPhaseForDate,
  getSkyPositions,
  parseDateStr,
} from '../engine/ephemeris';
import {
  CategoryTag,
  NatalChart,
  PlannerView,
  RitualCommitment,
  TransitEvent,
} from '../types/astrology';

interface PlannerViewsProps {
  view: PlannerView;
  selectedDate: string;
  events: TransitEvent[];
  selectedEventId: string | null;
  natalChart: NatalChart;
  commitments: Record<string, RitualCommitment>;
  eventTags: Record<string, string[]>;
  allTags: CategoryTag[];
  noteCounts: Record<string, number>;
  onSelectDate: (date: string) => void;
  onSelectEvent: (event: TransitEvent) => void;
  onSwitchView: (view: PlannerView) => void;
  onQuickCommit: (event: TransitEvent) => void;
}

const CATEGORY_META: Record<
  TransitEvent['category'],
  { label: string; accentText: string; topBar: string }
> = {
  activation: {
    label: 'Natal Activation',
    accentText: 'text-[#B8FF3B]',
    topBar: 'bg-[#B8FF3B]',
  },
  transit: {
    label: 'Planetary Shift',
    accentText: 'text-[#38BDF8]',
    topBar: 'bg-[#38BDF8]',
  },
  lunation: {
    label: 'Moon Phase',
    accentText: 'text-[#7DD3FC]',
    topBar: 'bg-[#38BDF8]',
  },
  retrograde: {
    label: 'Retrograde',
    accentText: 'text-[#FF7A2F]',
    topBar: 'bg-[#FF7A2F]',
  },
  custom: {
    label: 'Custom Ritual',
    accentText: 'text-[#B8FF3B]',
    topBar: 'bg-[#B8FF3B]',
  },
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventOccursOnDate(event: TransitEvent, dateStr: string): boolean {
  if (event.date === dateStr) return true;
  if (event.endDate && event.date <= dateStr && event.endDate >= dateStr) return true;
  return false;
}

function getWeekDates(anchorDate: string): string[] {
  const { year, month, day } = parseDateStr(anchorDate);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = dt.getUTCDay(); // 0 = Sun
  const sunday = addDays(anchorDate, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

function getMonthGrid(anchorDate: string): { date: string; inMonth: boolean }[] {
  const { year, month } = parseDateStr(anchorDate);
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const firstDt = new Date(Date.UTC(year, month - 1, 1));
  const startDow = firstDt.getUTCDay();
  const gridStart = addDays(firstOfMonth, -startDow);

  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const p = parseDateStr(d);
    return { date: d, inMonth: p.month === month };
  });
}

export const PlannerViews: React.FC<PlannerViewsProps> = ({
  view,
  selectedDate,
  events,
  selectedEventId,
  natalChart,
  commitments,
  eventTags,
  allTags,
  noteCounts,
  onSelectDate,
  onSelectEvent,
  onSwitchView,
  onQuickCommit,
}) => {
  const tagMap = useMemo(() => {
    const m = new Map<string, CategoryTag>();
    allTags.forEach((t) => m.set(t.id, t));
    return m;
  }, [allTags]);

  // Helper: render single Event Row in Day View or Agenda
  const renderEventRow = (ev: TransitEvent) => {
    const selected = selectedEventId === ev.id;
    const commit = commitments[ev.id];
    const isCommitted = commit && commit.status !== 'uncommitted';
    const isDone = commit?.status === 'completed';
    const meta = CATEGORY_META[ev.category];
    const tags = (eventTags[ev.id] ?? ev.userTags)
      .map((id) => tagMap.get(id))
      .filter((t): t is CategoryTag => Boolean(t));
    const notesCount = noteCounts[ev.id] ?? 0;

    return (
      <div
        key={ev.id}
        onClick={() => onSelectEvent(ev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectEvent(ev);
          }
        }}
        className={`group relative border transition-colors cursor-pointer ${
          selected
            ? 'bg-[#251A47] border-[#B8FF3B]'
            : ev.intensity === 'high'
            ? 'bg-[#1D1338] border-[#66361D] hover:border-[#FF7A2F]'
            : 'bg-[#1B1233] border-[#382864] hover:border-[#5D459B]'
        }`}
      >
        {/* Crisp top intensity hairline */}
        {ev.intensity === 'high' && <div className="h-[2px] w-full bg-[#FF7A2F]" />}

        <div className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Quiet unboxed metadata line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className={`font-medium ${meta.accentText}`}>{meta.label}</span>
              <span className="text-[#5F4E8F]" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-[#BEB4DE]">
                {PLANET_GLYPHS[ev.transitingPlanet]} {formatDegree(ev.transitingDegree)}{' '}
                {ZODIAC_GLYPHS[ev.transitingSign]} {ev.transitingSign}
              </span>
              <span className="text-[#5F4E8F]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#8D81B3]">{HOUSE_THEMES[ev.houseActivated].name}</span>
              {ev.intensity === 'high' && (
                <>
                  <span className="text-[#5F4E8F]" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#FF7A2F] font-semibold">
                    <Flame className="w-3 h-3" />
                    High Intensity
                  </span>
                </>
              )}
              {ev.endDate && (
                <>
                  <span className="text-[#5F4E8F]" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-[#FF9A5C]">
                    Span {ev.date.slice(5)}–{ev.endDate.slice(5)}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h4 className="text-base font-semibold text-[#F6F3FF] leading-snug">{ev.title}</h4>

            {/* Summary preview */}
            <p className="text-xs text-[#BEB4DE] line-clamp-2 leading-relaxed">{ev.summary}</p>

            {/* Bottom metadata: ritual & custom tags */}
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8D81B3]">
              <span>
                Ritual: <span className="text-[#E4DDF8]">{ev.ritualTitle}</span> ({ev.ritualDuration})
              </span>
              {notesCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#38BDF8] font-mono tabular-nums">
                    {notesCount} {notesCount === 1 ? 'note' : 'notes'}
                  </span>
                </>
              )}
              {tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {tags.map((tg) => (
                      <span
                        key={tg.id}
                        className={
                          tg.tone === 'lime'
                            ? 'text-[#B8FF3B]'
                            : tg.tone === 'sky'
                            ? 'text-[#38BDF8]'
                            : 'text-[#FF7A2F]'
                        }
                      >
                        {tg.label}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Quick RSVP Action */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-[11px] font-mono tabular-nums text-[#8D81B3]">
              {ev.timeWindow}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickCommit(ev);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                isDone
                  ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B]'
                  : isCommitted
                  ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8]'
                  : 'bg-[#140C28] text-[#F6F3FF] border-[#4A3682] hover:border-[#B8FF3B] hover:text-[#B8FF3B]'
              }`}
            >
              {isDone ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </>
              ) : isCommitted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RSVP’d
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5" />
                  Commit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ================= DAY VIEW =================
  if (view === 'day') {
    const dayEvents = events.filter((ev) => eventOccursOnDate(ev, selectedDate));
    const sky = getSkyPositions(selectedDate, 12);
    const moonInfo = getMoonPhaseForDate(selectedDate);
    const activeRetrogrades = (Object.values(sky) as (typeof sky)[keyof typeof sky][]).filter(
      (p) => p.retrograde && p.planet !== 'NorthNode'
    );

    // Also surface upcoming events within next 7 days if exact day has few hits
    const nextWeekDate = addDays(selectedDate, 7);
    const upcomingEvents = events.filter(
      (ev) => ev.date > selectedDate && ev.date <= nextWeekDate
    );

    const periodOrder: TransitEvent['timeWindow'][] = ['All Day', 'Dawn', 'Midday', 'Dusk', 'Night'];

    return (
      <div className="space-y-6">
        {/* Daily Ephemeris Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#382864] border border-[#382864]">
          <div className="bg-[#1B1233] p-4">
            <div className="text-xs text-[#8D81B3]">Lunar Phase</div>
            <div className="text-base font-semibold text-[#F6F3FF] mt-1 flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-[#38BDF8]" />
              {moonInfo.label}
            </div>
            <div className="text-xs font-mono tabular-nums text-[#BEB4DE] mt-0.5">
              {formatDegree(moonInfo.moonDegree)} {ZODIAC_GLYPHS[moonInfo.moonSign]}{' '}
              {moonInfo.moonSign} · {moonInfo.illumination}% lit
            </div>
          </div>

          <div className="bg-[#1B1233] p-4">
            <div className="text-xs text-[#8D81B3]">Solar Transit</div>
            <div className="text-base font-semibold text-[#F6F3FF] mt-1 font-mono tabular-nums">
              ☉ {formatDegree(sky.Sun.degree)} {sky.Sun.sign}
            </div>
            <div className="text-xs text-[#BEB4DE] mt-0.5">
              Mercury {formatDegree(sky.Mercury.degree)} {sky.Mercury.sign}
              {sky.Mercury.retrograde ? ' Rx' : ''}
            </div>
          </div>

          <div className="bg-[#1B1233] p-4">
            <div className="text-xs text-[#8D81B3]">Chiron Alignment</div>
            <div className="text-base font-semibold text-[#B8FF3B] mt-1 font-mono tabular-nums">
              ⚷ {formatDegree(sky.Chiron.degree)} {sky.Chiron.sign}
            </div>
            <div className="text-xs text-[#BEB4DE] mt-0.5">
              Your Natal Chiron: {formatDegree(natalChart.placements.Chiron.degree)}{' '}
              {natalChart.chironSign}
            </div>
          </div>

          <div className="bg-[#1B1233] p-4">
            <div className="text-xs text-[#8D81B3]">Active Retrogrades</div>
            <div className="text-base font-semibold text-[#FF7A2F] mt-1 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              <span className="font-mono tabular-nums">{activeRetrogrades.length}</span>
              <span>Stationed Rx</span>
            </div>
            <div className="text-xs text-[#BEB4DE] mt-0.5 truncate">
              {activeRetrogrades.length > 0
                ? activeRetrogrades.map((p) => PLANET_LABELS[p.planet]).join(', ')
                : 'All major planets direct'}
            </div>
          </div>
        </div>

        {/* Active Events Grouped by Time Window */}
        {dayEvents.length === 0 ? (
          <div className="border border-[#382864] bg-[#1B1233] p-8 text-center space-y-2">
            <h3 className="text-base font-semibold text-[#F6F3FF]">
              Quiet Cosmic Integration Day
            </h3>
            <p className="text-xs text-[#BEB4DE] max-w-md mx-auto">
              No exact peak transits or lunations land on {selectedDate}. Use this clear window to
              integrate recent insights or review the approaching week below.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {periodOrder.map((period) => {
              const group = dayEvents.filter((ev) => ev.timeWindow === period);
              if (group.length === 0) return null;
              return (
                <section key={period} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#382864] pb-1.5">
                    <h3 className="text-xs font-semibold text-[#BEB4DE]">{period}</h3>
                    <span className="text-xs font-mono tabular-nums text-[#8D81B3]">
                      {group.length} {group.length === 1 ? 'alignment' : 'alignments'}
                    </span>
                  </div>
                  <div className="space-y-2.5">{group.map(renderEventRow)}</div>
                </section>
              );
            })}
          </div>
        )}

        {/* Approaching 7-Day Horizon */}
        {upcomingEvents.length > 0 && (
          <section className="pt-4 border-t border-[#382864] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F6F3FF]">
                Approaching Within 7 Days
              </h3>
              <button
                type="button"
                onClick={() => onSwitchView('week')}
                className="text-xs text-[#38BDF8] hover:underline cursor-pointer"
              >
                Open Week Grid
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingEvents.slice(0, 4).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    onSelectDate(ev.date);
                    onSelectEvent(ev);
                  }}
                  className="text-left p-3.5 bg-[#1B1233] border border-[#382864] hover:border-[#B8FF3B] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono tabular-nums text-[#38BDF8]">{ev.date}</span>
                    {ev.intensity === 'high' && (
                      <span className="text-[#FF7A2F] font-semibold">High Intensity</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#F6F3FF] truncate">{ev.title}</div>
                  <div className="text-xs text-[#8D81B3] truncate mt-0.5">{ev.subtitle}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ================= WEEK VIEW =================
  if (view === 'week') {
    const weekDates = getWeekDates(selectedDate);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-[#382864] border border-[#382864]">
          {weekDates.map((d, idx) => {
            const isSelected = d === selectedDate;
            const dayEvs = events.filter((ev) => eventOccursOnDate(ev, d));
            const hasHigh = dayEvs.some((ev) => ev.intensity === 'high');
            const moon = getMoonPhaseForDate(d);
            const { day } = parseDateStr(d);

            return (
              <div
                key={d}
                onClick={() => onSelectDate(d)}
                className={`min-h-[260px] flex flex-col cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#231845]' : 'bg-[#160E2C] hover:bg-[#1B1233]'
                }`}
              >
                {/* Top Intensity Strip */}
                <div
                  className={`h-1 w-full ${
                    hasHigh ? 'bg-[#FF7A2F]' : isSelected ? 'bg-[#B8FF3B]' : 'bg-transparent'
                  }`}
                />

                {/* Day Column Header */}
                <div className="p-3 border-b border-[#302157] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#8D81B3]">{WEEKDAY_LABELS[idx]}</div>
                    <div
                      className={`text-lg font-mono tabular-nums font-semibold ${
                        isSelected ? 'text-[#B8FF3B]' : 'text-[#F6F3FF]'
                      }`}
                    >
                      {day}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#38BDF8] font-mono">
                      ☽ {ZODIAC_GLYPHS[moon.moonSign]}
                    </div>
                    <div className="text-[10px] text-[#8D81B3]">{moon.moonSign}</div>
                  </div>
                </div>

                {/* Day Events Stack */}
                <div className="p-2 flex-1 space-y-1.5 overflow-y-auto">
                  {dayEvs.length === 0 ? (
                    <div className="text-[11px] text-[#695C94] pt-2 px-1">Clear window</div>
                  ) : (
                    dayEvs.map((ev) => {
                      const active = selectedEventId === ev.id;
                      const commit = commitments[ev.id];
                      const isSpanCarry = ev.date !== d && Boolean(ev.endDate);
                      return (
                        <button
                          key={`${d}-${ev.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDate(d);
                            onSelectEvent(ev);
                          }}
                          className={`w-full text-left p-2 border text-xs transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#2E2059] border-[#B8FF3B]'
                              : ev.intensity === 'high'
                              ? 'bg-[#241536] border-[#78391D] hover:border-[#FF7A2F]'
                              : ev.category === 'activation'
                              ? 'bg-[#1A2426] border-[#385223] hover:border-[#B8FF3B]'
                              : 'bg-[#171E38] border-[#25496B] hover:border-[#38BDF8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono mb-0.5">
                            <span
                              className={
                                ev.intensity === 'high'
                                  ? 'text-[#FF7A2F]'
                                  : ev.category === 'activation'
                                  ? 'text-[#B8FF3B]'
                                  : 'text-[#38BDF8]'
                              }
                            >
                              {PLANET_GLYPHS[ev.transitingPlanet]}{' '}
                              {isSpanCarry ? 'Rx Active' : ev.timeWindow}
                            </span>
                            {commit && commit.status !== 'uncommitted' && (
                              <span className="text-[#B8FF3B]">✓</span>
                            )}
                          </div>
                          <div className="font-medium text-[#F6F3FF] leading-tight line-clamp-2">
                            {ev.title}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Detailed List underneath Week Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F6F3FF]">
              Agenda for <span className="font-mono tabular-nums text-[#B8FF3B]">{selectedDate}</span>
            </h3>
            <button
              type="button"
              onClick={() => onSwitchView('day')}
              className="text-xs text-[#38BDF8] hover:underline cursor-pointer"
            >
              Open Full Day View
            </button>
          </div>
          {events.filter((ev) => eventOccursOnDate(ev, selectedDate)).length === 0 ? (
            <div className="p-5 bg-[#1B1233] border border-[#382864] text-xs text-[#BEB4DE]">
              No exact transits peak on {selectedDate}. Select any highlighted day column above to
              inspect its alignments.
            </div>
          ) : (
            <div className="space-y-2.5">
              {events.filter((ev) => eventOccursOnDate(ev, selectedDate)).map(renderEventRow)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= MONTH VIEW =================
  if (view === 'month') {
    const grid = getMonthGrid(selectedDate);
    const selectedDayEvents = events.filter((ev) => eventOccursOnDate(ev, selectedDate));

    return (
      <div className="space-y-6">
        <div className="border border-[#382864] bg-[#382864]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAY_LABELS.map((wd) => (
              <div
                key={wd}
                className="bg-[#1B1233] px-3 py-2 text-xs font-medium text-[#BEB4DE] text-left"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* 42 Calendar Cells */}
          <div className="grid grid-cols-7 gap-px mt-px">
            {grid.map(({ date, inMonth }) => {
              const isSelected = date === selectedDate;
              const { day } = parseDateStr(date);
              const dayEvs = events.filter((ev) => eventOccursOnDate(ev, date));
              const exactDayEvs = dayEvs.filter((ev) => ev.date === date);
              const activeRx = dayEvs.some((ev) => ev.category === 'retrograde');
              const hasHigh = exactDayEvs.some((ev) => ev.intensity === 'high');
              const lunation = exactDayEvs.find((ev) => ev.lunarPhase);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={`min-h-[96px] p-2 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#261A4A] ring-1 ring-inset ring-[#B8FF3B]'
                      : inMonth
                      ? 'bg-[#150D2A] hover:bg-[#1E143B]'
                      : 'bg-[#100920] text-[#5C4F82] hover:bg-[#170F2E]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        isSelected
                          ? 'text-[#B8FF3B]'
                          : inMonth
                          ? 'text-[#F6F3FF]'
                          : 'text-[#5F5285]'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {lunation && (
                        <span
                          className="text-[11px] text-[#38BDF8]"
                          title={lunation.title}
                        >
                          {lunation.lunarPhase === 'Full Moon' ? '○' : '●'}
                        </span>
                      )}
                      {hasHigh && (
                        <span
                          className="text-[10px] font-mono font-bold text-[#FF7A2F]"
                          title="High-intensity transit"
                        >
                          ▲
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact Event Lines */}
                  <div className="space-y-1 mt-1.5 w-full">
                    {exactDayEvs.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 text-[10px] truncate border ${
                          ev.intensity === 'high'
                            ? 'bg-[#2B172F] border-[#FF7A2F]/60 text-[#FFB180]'
                            : ev.category === 'activation'
                            ? 'bg-[#1C2A24] border-[#B8FF3B]/50 text-[#D4FF82]'
                            : 'bg-[#162440] border-[#38BDF8]/50 text-[#9BE0FF]'
                        }`}
                      >
                        {PLANET_GLYPHS[ev.transitingPlanet]} {ev.title}
                      </div>
                    ))}
                    {exactDayEvs.length > 2 && (
                      <div className="text-[10px] font-mono text-[#8D81B3] px-1">
                        +{exactDayEvs.length - 2} more
                      </div>
                    )}
                    {exactDayEvs.length === 0 && activeRx && inMonth && (
                      <div className="h-[3px] w-full bg-[#FF7A2F]/50" title="Retrograde active" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda Strip */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#382864] pb-2">
            <h3 className="text-sm font-semibold text-[#F6F3FF] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#B8FF3B]" />
              Selected Day:{' '}
              <span className="font-mono tabular-nums text-[#B8FF3B]">{selectedDate}</span>
            </h3>
            <button
              type="button"
              onClick={() => onSwitchView('day')}
              className="text-xs text-[#38BDF8] hover:underline cursor-pointer"
            >
              Inspect Day Timeline
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="p-5 bg-[#1B1233] border border-[#382864] text-xs text-[#BEB4DE]">
              No exact peaks on {selectedDate}. Click any highlighted calendar square to inspect its
              transits and RSVP to alignment rituals.
            </div>
          ) : (
            <div className="space-y-2.5">{selectedDayEvents.map(renderEventRow)}</div>
          )}
        </div>
      </div>
    );
  }

  // ================= YEAR VIEW =================
  const { year } = parseDateStr(selectedDate);
  const yearEvents = events.filter((ev) => ev.date.startsWith(`${year}-`));

  return (
    <div className="space-y-6">
      {/* 12-Month Ephemeris Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MONTH_NAMES.map((mName, idx) => {
          const mm = String(idx + 1).padStart(2, '0');
          const prefix = `${year}-${mm}-`;
          const mEvents = yearEvents.filter((ev) => ev.date.startsWith(prefix));
          const highCount = mEvents.filter((ev) => ev.intensity === 'high').length;
          const eclipseCount = mEvents.filter((ev) => ev.isEclipse).length;
          const rxEvents = mEvents.filter((ev) => ev.category === 'retrograde');
          const topShift = mEvents.find((ev) => ev.intensity === 'high') ?? mEvents[0];

          return (
            <div
              key={mName}
              onClick={() => {
                onSelectDate(`${year}-${mm}-01`);
                onSwitchView('month');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(`${year}-${mm}-01`);
                  onSwitchView('month');
                }
              }}
              className="bg-[#1B1233] border border-[#382864] hover:border-[#B8FF3B] transition-colors cursor-pointer flex flex-col justify-between"
            >
              {highCount >= 2 ? (
                <div className="h-[3px] w-full bg-[#FF7A2F]" />
              ) : (
                <div className="h-[3px] w-full bg-[#382864]" />
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-base font-semibold text-[#F6F3FF]">{mName}</h4>
                  <span className="text-xs font-mono tabular-nums text-[#8D81B3]">
                    {mEvents.length} events
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums">
                  {highCount > 0 && (
                    <span className="text-[#FF7A2F]">{highCount} peak</span>
                  )}
                  {eclipseCount > 0 && (
                    <>
                      <span className="text-[#5F4E8F]">·</span>
                      <span className="text-[#38BDF8]">{eclipseCount} eclipse</span>
                    </>
                  )}
                  {rxEvents.length > 0 && (
                    <>
                      <span className="text-[#5F4E8F]">·</span>
                      <span className="text-[#FF9A5C]">Rx station</span>
                    </>
                  )}
                </div>

                {topShift ? (
                  <div className="pt-2 border-t border-[#302157]">
                    <div className="text-[11px] font-mono tabular-nums text-[#38BDF8]">
                      {topShift.date.slice(5)} · {PLANET_GLYPHS[topShift.transitingPlanet]}{' '}
                      {topShift.transitingSign}
                    </div>
                    <div className="text-xs font-medium text-[#E4DDF8] mt-0.5 line-clamp-2">
                      {topShift.title}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#302157] text-xs text-[#695C94]">
                    Open month to inspect transits
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annual Major Shifts & High-Intensity Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#382864] pb-2">
          <h3 className="text-sm font-semibold text-[#F6F3FF]">
            {year} High-Intensity Shifts, Eclipses &amp; Retrogrades
          </h3>
          <span className="text-xs font-mono tabular-nums text-[#FF7A2F]">
            {yearEvents.filter((e) => e.intensity === 'high').length} high-intensity milestones
          </span>
        </div>

        <div className="space-y-2.5">
          {yearEvents
            .filter((e) => e.intensity === 'high')
            .slice(0, 18)
            .map(renderEventRow)}
        </div>
      </div>
    </div>
  );
};
