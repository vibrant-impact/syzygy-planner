import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Search, SlidersHorizontal } from 'lucide-react';
import { BiWheelChart } from './components/BiWheelChart';
import { BirthProfileDrawer } from './components/BirthProfileDrawer';
import { EventDetailPanel } from './components/EventDetailPanel';
import { NatalChartSection } from './components/NatalChartSection';
import { PlannerViews } from './components/PlannerViews';
import { ReflectionsView, RitualsView } from './components/RitualsAndReflections';
import { SyzygyLogoMark } from './components/SyzygyLogoMark';
import {
  DEFAULT_BIRTH_PROFILE,
  DEFAULT_USER_TAGS,
  PLANET_GLYPHS,
  ZODIAC_GLYPHS,
} from './data/presets';
import {
  addDays,
  calculateHouse,
  calculateNatalChart,
  formatDateStr,
  formatDegree,
  generatePersonalizedEvents,
  parseDateStr,
  signToLon,
} from './engine/ephemeris';
import {
  ActiveSection,
  BirthProfile,
  CategoryTag,
  EventCategoryId,
  PlanetId,
  PlannerView,
  ReflectionNote,
  RitualCommitment,
  RitualStatus,
  TransitEvent,
  ZodiacSign,
} from './types/astrology';

const STORAGE_KEYS = {
  profile: 'syzygy_birth_profile_v2',
  commitments: 'syzygy_commitments_v1',
  notes: 'syzygy_reflection_notes_v1',
  tags: 'syzygy_user_tags_v1',
  eventTags: 'syzygy_event_tags_v1',
  customEvents: 'syzygy_custom_events_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const INITIAL_COMMITMENTS: Record<string, RitualCommitment> = {
  'station-direct-nov-2026': {
    eventId: 'station-direct-nov-2026',
    status: 'completed',
    scheduledTime: '19:30',
    intention: 'Synthesize insights from October’s Venus & Mercury retrogrades with clean boundaries.',
    completedSteps: [0, 1, 2],
    updatedAt: '2026-11-13T19:45:00.000Z',
  },
  'shift-chiron-taurus-2026': {
    eventId: 'shift-chiron-taurus-2026',
    status: 'committed',
    scheduledTime: '08:00',
    intention: 'Honor my Chiron in Taurus cycle through steadier daily pacing and bodily trust.',
    completedSteps: [0],
    updatedAt: '2026-11-15T09:10:00.000Z',
  },
};

const INITIAL_NOTES: ReflectionNote[] = [
  {
    id: 'seed-note-1',
    eventId: 'station-direct-nov-2026',
    eventTitle: 'Mercury & Venus Station Direct',
    eventDate: '2026-11-13',
    category: 'transit',
    planet: 'Venus',
    content:
      'Clarity returned almost overnight around a creative partnership that felt stalled throughout October. Ready to formalize terms without over-accommodating.',
    resonance: 'Clear',
    createdAt: '2026-11-14T08:20:00.000Z',
  },
  {
    id: 'seed-note-2',
    eventId: 'rx-chiron-taurus-2026',
    eventTitle: 'Chiron Stations Retrograde in Taurus',
    eventDate: '2026-08-03',
    category: 'retrograde',
    planet: 'Chiron',
    content:
      'Strong somatic reminder that worth is not measured by constant output. Stepping outside barefoot and simplifying my weekly schedule immediately lowered tension.',
    resonance: 'Grounded',
    createdAt: '2026-11-10T21:05:00.000Z',
  },
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getInitialDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  if (y >= 2026 && y <= 2028) {
    return formatDateStr(now);
  }
  return '2026-11-18';
}

export default function App() {
  const [section, setSection] = useState<ActiveSection>('planner');
  const [plannerView, setPlannerView] = useState<PlannerView>('month');
  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  // Persistent domain state
  const [birthProfile, setBirthProfile] = useState<BirthProfile>(() =>
    loadFromStorage(STORAGE_KEYS.profile, DEFAULT_BIRTH_PROFILE)
  );
  const [commitments, setCommitments] = useState<Record<string, RitualCommitment>>(() =>
    loadFromStorage(STORAGE_KEYS.commitments, INITIAL_COMMITMENTS)
  );
  const [notes, setNotes] = useState<ReflectionNote[]>(() =>
    loadFromStorage(STORAGE_KEYS.notes, INITIAL_NOTES)
  );
  const [userTags, setUserTags] = useState<CategoryTag[]>(() =>
    loadFromStorage(STORAGE_KEYS.tags, DEFAULT_USER_TAGS)
  );
  const [eventTags, setEventTags] = useState<Record<string, string[]>>(() =>
    loadFromStorage(STORAGE_KEYS.eventTags, {})
  );
  const [customEvents, setCustomEvents] = useState<TransitEvent[]>(() =>
    loadFromStorage(STORAGE_KEYS.customEvents, [])
  );

  // Interactive filter state
  const [categoryFilter, setCategoryFilter] = useState<EventCategoryId | 'all'>('all');
  const [highIntensityOnly, setHighIntensityOnly] = useState(false);
  const [activeUserTag, setActiveUserTag] = useState<string | null>(null);
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(birthProfile));
  }, [birthProfile]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.commitments, JSON.stringify(commitments));
  }, [commitments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  }, [notes]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(userTags));
  }, [userTags]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.eventTags, JSON.stringify(eventTags));
  }, [eventTags]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customEvents, JSON.stringify(customEvents));
  }, [customEvents]);

  // Compute user's Natal Chart dynamically
  const natalChart = useMemo(() => calculateNatalChart(birthProfile), [birthProfile]);

  // Compute 2026-2028 personalized ephemeris events (fast memoized generation)
  const { year: activeYear } = parseDateStr(selectedDate);
  const allGeneratedEvents = useMemo(() => {
    // Generate full 2026-2028 horizon (or current active year if outside 2026-2028)
    const start = activeYear < 2026 ? `${activeYear}-01-01` : '2026-01-01';
    const end = activeYear > 2028 ? `${activeYear}-12-31` : '2028-12-31';
    const generated = generatePersonalizedEvents(natalChart, start, end);
    return [...generated, ...customEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [natalChart, customEvents, activeYear]);

  // Apply category, high-intensity, user-tag, planet, and search filters
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allGeneratedEvents.filter((ev) => {
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
      if (highIntensityOnly && ev.intensity !== 'high') return false;
      if (focusedPlanet && ev.transitingPlanet !== focusedPlanet && ev.natalPlanet !== focusedPlanet) {
        return false;
      }
      if (activeUserTag) {
        const assigned = eventTags[ev.id] ?? ev.userTags;
        if (!assigned.includes(activeUserTag)) return false;
      }
      if (q) {
        const hay = `${ev.title} ${ev.subtitle} ${ev.summary} ${ev.transitingSign} ${
          ev.natalSign ?? ''
        } ${ev.ritualTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allGeneratedEvents,
    categoryFilter,
    highIntensityOnly,
    focusedPlanet,
    activeUserTag,
    eventTags,
    searchQuery,
  ]);

  const selectedEvent = useMemo(
    () => allGeneratedEvents.find((ev) => ev.id === selectedEventId) ?? null,
    [allGeneratedEvents, selectedEventId]
  );

  // Count notes per event for quick badges
  const noteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach((n) => {
      map[n.eventId] = (map[n.eventId] ?? 0) + 1;
    });
    return map;
  }, [notes]);

  // Date Stepping
  const stepDate = (direction: -1 | 1) => {
    const { year, month, day } = parseDateStr(selectedDate);
    if (plannerView === 'day') {
      setSelectedDate(addDays(selectedDate, direction));
    } else if (plannerView === 'week') {
      setSelectedDate(addDays(selectedDate, direction * 7));
    } else if (plannerView === 'month') {
      const nextDt = new Date(Date.UTC(year, month - 1 + direction, 1));
      setSelectedDate(
        `${nextDt.getUTCFullYear()}-${String(nextDt.getUTCMonth() + 1).padStart(2, '0')}-01`
      );
    } else {
      const nextY = year + direction;
      setSelectedDate(`${nextY}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  };

  const formattedPeriodHeading = useMemo(() => {
    const { year, month, day } = parseDateStr(selectedDate);
    if (plannerView === 'year') return `${year} Ephemeris`;
    if (plannerView === 'month') return `${MONTH_SHORT[month - 1]} ${year}`;
    if (plannerView === 'week') {
      const end = addDays(selectedDate, 6);
      return `${MONTH_SHORT[month - 1]} ${day} – ${end.slice(5)}, ${year}`;
    }
    return `${MONTH_SHORT[month - 1]} ${day}, ${year}`;
  }, [selectedDate, plannerView]);

  // Handlers
  const handleUpdateCommitment = (eventId: string, next: RitualCommitment) => {
    setCommitments((prev) => ({ ...prev, [eventId]: next }));
  };

  const handleQuickCommit = (event: TransitEvent) => {
    const existing = commitments[event.id];
    const nextStatus: RitualStatus =
      !existing || existing.status === 'uncommitted'
        ? 'committed'
        : existing.status === 'committed'
        ? 'completed'
        : 'uncommitted';

    handleUpdateCommitment(event.id, {
      eventId: event.id,
      status: nextStatus,
      scheduledTime: existing?.scheduledTime ?? '20:00',
      intention: existing?.intention ?? '',
      completedSteps: existing?.completedSteps ?? [],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateStatus = (eventId: string, status: RitualStatus) => {
    const existing = commitments[eventId];
    handleUpdateCommitment(eventId, {
      eventId,
      status,
      scheduledTime: existing?.scheduledTime ?? '20:00',
      intention: existing?.intention ?? '',
      completedSteps: existing?.completedSteps ?? [],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleTag = (eventId: string, tagId: string) => {
    const ev = allGeneratedEvents.find((e) => e.id === eventId);
    setEventTags((prev) => {
      const current = prev[eventId] ?? ev?.userTags ?? [];
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      return { ...prev, [eventId]: next };
    });
  };

  const handleCreateTag = (label: string, tone: 'lime' | 'sky' | 'orange') => {
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    setUserTags((prev) => [...prev, { id, label, tone }]);
    return id;
  };

  const handleAddNote = (noteInput: Omit<ReflectionNote, 'id' | 'createdAt'>) => {
    const newNote: ReflectionNote = {
      ...noteInput,
      id: `note-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleCreateCustomEvent = (input: {
    title: string;
    date: string;
    timeWindow: TransitEvent['timeWindow'];
    sign: ZodiacSign;
    ritualTitle: string;
    ritualSteps: string[];
    summary: string;
  }) => {
    const id = `custom-${Date.now().toString(36)}`;
    const lon = signToLon(input.sign, 15);
    const houseActivated = calculateHouse(
      lon,
      natalChart.placements.Ascendant.longitude,
      natalChart.profile.houseSystem,
      natalChart.houseCusps
    );

    const newEv: TransitEvent = {
      id,
      title: input.title,
      subtitle: `Personal Alignment · ${input.sign}`,
      date: input.date,
      timeWindow: input.timeWindow,
      category: 'custom',
      userTags: ['healing'],
      intensity: 'medium',
      transitingPlanet: 'Moon',
      transitingSign: input.sign,
      transitingDegree: 15,
      houseActivated,
      summary: input.summary,
      ritualTitle: input.ritualTitle,
      ritualSteps: input.ritualSteps,
      ritualDuration: '20 min',
      isCustom: true,
    };

    setCustomEvents((prev) => [...prev, newEv]);
    handleUpdateCommitment(id, {
      eventId: id,
      status: 'committed',
      scheduledTime: '20:00',
      intention: '',
      completedSteps: [],
      updatedAt: new Date().toISOString(),
    });
    setSelectedDate(input.date);
    setSelectedEventId(id);
  };

  const handleJumpToEvent = (eventId: string, eventDate: string) => {
    setSelectedDate(eventDate);
    setSelectedEventId(eventId);
    setSection('planner');
    setPlannerView('day');
  };

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: 'planner', label: 'Planner' },
    { id: 'chart', label: 'Natal Chart' },
    { id: 'rituals', label: 'Rituals' },
    { id: 'reflections', label: 'Reflections' },
  ];

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (highIntensityOnly ? 1 : 0) +
    (activeUserTag ? 1 : 0) +
    (focusedPlanet ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#120B24] text-[#F6F3FF] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#120B24]/95 backdrop-blur-xs border-b border-[#382864]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark + Animated Emblem */}
          <button
            type="button"
            onClick={() => setSection('planner')}
            className="group inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#F6F3FF] hover:text-[#B8FF3B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <SyzygyLogoMark size={30} />
            <span>Syzygy</span>
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto" aria-label="Primary">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#B8FF3B] border-[#B8FF3B]'
                      : 'text-[#BEB4DE] border-transparent hover:text-[#F6F3FF] hover:border-[#6A58A3]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] hover:bg-[#CAFF6B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Edit Birth Chart
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {section === 'planner' && (
          <div className="space-y-5">
            {/* Personalized Chart Context & Timeframe Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#382864]">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#BEB4DE]">
                  <span className="font-semibold text-[#F6F3FF]">{natalChart.profile.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    ☉ {natalChart.sunSign} · ☽ {natalChart.moonSign} · AC {natalChart.ascendantSign}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#B8FF3B]">
                    ⚷ Chiron {formatDegree(natalChart.placements.Chiron.degree)}{' '}
                    {natalChart.chironSign}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#F6F3FF] tracking-tight">
                  {formattedPeriodHeading}
                </h1>
              </div>

              {/* Date Stepper + Day/Week/Month/Year Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Controls */}
                <div className="inline-flex items-center border border-[#382864] bg-[#1B1233]">
                  <button
                    type="button"
                    onClick={() => stepDate(-1)}
                    className="p-2 text-[#BEB4DE] hover:text-[#F6F3FF] hover:bg-[#291C4D] transition-colors cursor-pointer"
                    aria-label="Previous period"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getInitialDate())}
                    className="px-3 py-2 text-xs font-mono font-medium text-[#F6F3FF] hover:text-[#B8FF3B] border-x border-[#382864] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => stepDate(1)}
                    className="p-2 text-[#BEB4DE] hover:text-[#F6F3FF] hover:bg-[#291C4D] transition-colors cursor-pointer"
                    aria-label="Next period"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick 2026 / 2027 / 2028 Jump */}
                <div className="inline-flex items-center border border-[#382864] bg-[#1B1233] p-0.5">
                  {[2026, 2027, 2028].map((yr) => {
                    const active = activeYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          const { month, day } = parseDateStr(selectedDate);
                          setSelectedDate(
                            `${yr}-${String(month).padStart(2, '0')}-${String(
                              Math.min(day, 28)
                            ).padStart(2, '0')}`
                          );
                        }}
                        className={`px-2.5 py-1.5 text-xs font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#38BDF8] text-[#120B24] font-semibold'
                            : 'text-[#BEB4DE] hover:text-[#F6F3FF]'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>

                {/* Day / Week / Month / Year Segmented Control */}
                <div
                  className="inline-flex items-center border border-[#382864] bg-[#160E2C] p-0.5"
                  role="tablist"
                  aria-label="Planner timeframe"
                >
                  {(['day', 'week', 'month', 'year'] as PlannerView[]).map((v) => {
                    const active = plannerView === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPlannerView(v)}
                        className={`px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#B8FF3B] text-[#120B24]'
                            : 'text-[#BEB4DE] hover:text-[#F6F3FF]'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interactive Category Chips (Vibrant Lime, Sky-Blue & Warm Orange) + Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-[#F6F3FF] text-[#120B24] border-[#F6F3FF]'
                      : 'bg-[#1B1233] text-[#BEB4DE] border-[#382864] hover:border-[#F6F3FF]'
                  }`}
                >
                  All Alignments
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryFilter(categoryFilter === 'activation' ? 'all' : 'activation')
                  }
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'activation'
                      ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B]'
                      : 'bg-[#1B1233] text-[#B8FF3B] border-[#426118] hover:border-[#B8FF3B]'
                  }`}
                >
                  Natal Activations
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryFilter(categoryFilter === 'transit' ? 'all' : 'transit')
                  }
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'transit'
                      ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8]'
                      : 'bg-[#1B1233] text-[#38BDF8] border-[#1E4F6E] hover:border-[#38BDF8]'
                  }`}
                >
                  Planetary Shifts
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryFilter(categoryFilter === 'lunation' ? 'all' : 'lunation')
                  }
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'lunation'
                      ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8]'
                      : 'bg-[#1B1233] text-[#7DD3FC] border-[#1E4F6E] hover:border-[#38BDF8]'
                  }`}
                >
                  Moon Phases
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryFilter(categoryFilter === 'retrograde' ? 'all' : 'retrograde')
                  }
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'retrograde'
                      ? 'bg-[#FF7A2F] text-[#120B24] border-[#FF7A2F]'
                      : 'bg-[#1B1233] text-[#FF9A5C] border-[#6E3415] hover:border-[#FF7A2F]'
                  }`}
                >
                  Retrogrades
                </button>

                <button
                  type="button"
                  onClick={() => setHighIntensityOnly(!highIntensityOnly)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    highIntensityOnly
                      ? 'bg-[#FF7A2F] text-[#120B24] border-[#FF7A2F]'
                      : 'bg-[#1B1233] text-[#FF7A2F] border-[#6E3415] hover:border-[#FF7A2F]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  High Intensity
                </button>

                {userTags.slice(0, 3).map((tag) => {
                  const active = activeUserTag === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setActiveUserTag(active ? null : tag.id)}
                      className={`px-2.5 py-1.5 text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? tag.tone === 'lime'
                            ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B] font-semibold'
                            : tag.tone === 'sky'
                            ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8] font-semibold'
                            : 'bg-[#FF7A2F] text-[#120B24] border-[#FF7A2F] font-semibold'
                          : 'bg-[#160E2C] text-[#BEB4DE] border-[#382864] hover:border-[#7865B5]'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('all');
                      setHighIntensityOnly(false);
                      setActiveUserTag(null);
                      setFocusedPlanet(null);
                      setSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 text-xs text-[#BEB4DE] hover:text-[#B8FF3B] underline cursor-pointer whitespace-nowrap"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="relative w-full xl:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-[#8D81B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter sign, planet, ritual..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1B1233] border border-[#382864] text-[#F6F3FF] placeholder:text-[#786BA1] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            {/* 12-Column Asymmetric Split: Planner Stage (8 cols) + Live Inspector / Bi-Wheel (4 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8 min-w-0">
                <PlannerViews
                  view={plannerView}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  natalChart={natalChart}
                  commitments={commitments}
                  eventTags={eventTags}
                  allTags={userTags}
                  noteCounts={noteCounts}
                  onSelectDate={setSelectedDate}
                  onSelectEvent={(ev) => setSelectedEventId(ev.id)}
                  onSwitchView={setPlannerView}
                  onQuickCommit={handleQuickCommit}
                />
              </div>

              {/* Right Column: Selected Transit Inspector OR Live Bi-Wheel Sky Compass */}
              <div className="xl:col-span-4 xl:sticky xl:top-20">
                {selectedEvent ? (
                  <EventDetailPanel
                    event={selectedEvent}
                    commitment={commitments[selectedEvent.id]}
                    notes={notes.filter((n) => n.eventId === selectedEvent.id)}
                    allTags={userTags}
                    assignedTags={eventTags[selectedEvent.id] ?? selectedEvent.userTags}
                    onClose={() => setSelectedEventId(null)}
                    onUpdateCommitment={handleUpdateCommitment}
                    onToggleTag={handleToggleTag}
                    onCreateTag={handleCreateTag}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                  />
                ) : (
                  <div className="bg-[#1B1233] border border-[#382864] p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-[#F6F3FF]">
                          Live Bi-Wheel Compass
                        </h2>
                        <p className="text-xs text-[#8D81B3] mt-0.5">
                          Natal placements vs. sky transits on{' '}
                          <span className="font-mono text-[#38BDF8]">{selectedDate}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSection('chart')}
                        className="text-xs text-[#B8FF3B] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Full Chart
                      </button>
                    </div>

                    <BiWheelChart
                      natalChart={natalChart}
                      selectedDate={selectedDate}
                      focusedPlanet={focusedPlanet}
                      onSelectPlanet={setFocusedPlanet}
                      size={360}
                    />

                    {/* Key Upcoming High-Intensity Shifts Quick Picker */}
                    <div className="pt-4 border-t border-[#382864] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-[#F6F3FF] inline-flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF7A2F]" />
                          Key {activeYear} Milestones
                        </h3>
                        <span className="text-[11px] font-mono text-[#8D81B3]">Click to RSVP</span>
                      </div>

                      <div className="space-y-1.5">
                        {allGeneratedEvents
                          .filter(
                            (ev) =>
                              ev.date.startsWith(`${activeYear}-`) &&
                              ev.intensity === 'high' &&
                              (ev.id.startsWith('shift-') ||
                                ev.id.startsWith('eclipse-') ||
                                ev.id.startsWith('rx-venus') ||
                                ev.id.startsWith('rx-saturn') ||
                                ev.id.startsWith('rx-chiron'))
                          )
                          .slice(0, 6)
                          .map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => {
                                setSelectedDate(ev.date);
                                setSelectedEventId(ev.id);
                              }}
                              className="w-full text-left p-2.5 bg-[#140C28] border border-[#302157] hover:border-[#FF7A2F] transition-colors cursor-pointer flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-[#F6F3FF] truncate">
                                  {PLANET_GLYPHS[ev.transitingPlanet]} {ev.title}
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-[#8D81B3]">
                                  {ev.date} · {ZODIAC_GLYPHS[ev.transitingSign]} {ev.transitingSign}
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-[#FF7A2F] shrink-0">
                                Inspect
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'chart' && (
          <NatalChartSection
            natalChart={natalChart}
            selectedDate={selectedDate}
            focusedPlanet={focusedPlanet}
            onSelectPlanet={(p) => {
              setFocusedPlanet(p);
              if (p) setSection('planner');
            }}
            onEditBirthProfile={() => setProfileDrawerOpen(true)}
          />
        )}

        {section === 'rituals' && (
          <RitualsView
            events={allGeneratedEvents}
            commitments={commitments}
            onSelectEvent={(ev) => {
              setSelectedDate(ev.date);
              setSelectedEventId(ev.id);
              setSection('planner');
            }}
            onUpdateStatus={handleUpdateStatus}
            onCreateCustomEvent={handleCreateCustomEvent}
          />
        )}

        {section === 'reflections' && (
          <ReflectionsView
            notes={notes}
            onDeleteNote={handleDeleteNote}
            onJumpToEvent={handleJumpToEvent}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#2E2054] mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#8D81B3]">
          <div>
            Syzygy Astrological Transit Planner · Tropical Zodiac ({birthProfile.houseSystem})
          </div>
          <div className="flex items-center gap-4">
            <span>
              {Object.values(commitments).filter((c) => c.status !== 'uncommitted').length}{' '}
              committed rituals
            </span>
            <span aria-hidden="true">·</span>
            <span>{notes.length} reflection notes saved locally</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              className="text-[#BEB4DE] hover:text-[#B8FF3B] cursor-pointer"
            >
              Birth Details
            </button>
          </div>
        </div>
      </footer>

      {/* Birth Chart Input & Override Drawer */}
      <BirthProfileDrawer
        open={profileDrawerOpen}
        profile={birthProfile}
        onClose={() => setProfileDrawerOpen(false)}
        onSave={(nextProfile) => {
          setBirthProfile(nextProfile);
          setSelectedEventId(null);
        }}
      />
    </div>
  );
}
