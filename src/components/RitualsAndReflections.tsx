import React, { useState } from 'react';
import { CheckCircle2, Clock, Flame, Plus, Search, Trash2 } from 'lucide-react';
import { PLANET_GLYPHS, PLANET_LABELS, ZODIAC_SIGNS } from '../data/presets';
import {
  ReflectionNote,
  ResonanceTag,
  RitualCommitment,
  RitualStatus,
  TransitEvent,
  ZodiacSign,
} from '../types/astrology';

interface RitualsViewProps {
  events: TransitEvent[];
  commitments: Record<string, RitualCommitment>;
  onSelectEvent: (event: TransitEvent) => void;
  onUpdateStatus: (eventId: string, status: RitualStatus) => void;
  onCreateCustomEvent: (input: {
    title: string;
    date: string;
    timeWindow: TransitEvent['timeWindow'];
    sign: ZodiacSign;
    ritualTitle: string;
    ritualSteps: string[];
    summary: string;
  }) => void;
}

export const RitualsView: React.FC<RitualsViewProps> = ({
  events,
  commitments,
  onSelectEvent,
  onUpdateStatus,
  onCreateCustomEvent,
}) => {
  const [filter, setFilter] = useState<'all' | 'committed' | 'completed'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-18');
  const [timeWindow, setTimeWindow] = useState<TransitEvent['timeWindow']>('Dusk');
  const [sign, setSign] = useState<ZodiacSign>('Taurus');
  const [ritualTitle, setRitualTitle] = useState('');
  const [stepsText, setStepsText] = useState('');

  const rsvpList = events
    .filter((ev) => {
      const c = commitments[ev.id];
      if (!c || c.status === 'uncommitted') return false;
      if (filter === 'all') return true;
      return c.status === filter;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const committedCount = Object.values(commitments).filter((c) => c.status === 'committed').length;
  const completedCount = Object.values(commitments).filter((c) => c.status === 'completed').length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedSteps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onCreateCustomEvent({
      title: title.trim(),
      date,
      timeWindow,
      sign,
      ritualTitle: ritualTitle.trim() || title.trim(),
      ritualSteps:
        parsedSteps.length > 0
          ? parsedSteps
          : ['Set a quiet 15-minute container and log your core intention.'],
      summary: `Personal alignment commitment scheduled under ${sign} resonance.`,
    });
    setTitle('');
    setRitualTitle('');
    setStepsText('');
    setShowNewForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#382864] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F6F3FF]">
            Alignment Rituals &amp; RSVPs
          </h1>
          <p className="text-xs text-[#BEB4DE] mt-1">
            Track committed transit ceremonies, somatic check-ins, and completed alignment work.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] hover:bg-[#CAFF6B] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Schedule Custom Ritual
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#382864] border border-[#382864]">
        <div className="bg-[#1B1233] p-4">
          <div className="text-xs text-[#8D81B3]">Active Commitments</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#38BDF8] mt-1">
            {committedCount}
          </div>
        </div>
        <div className="bg-[#1B1233] p-4">
          <div className="text-xs text-[#8D81B3]">Completed Rituals</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#B8FF3B] mt-1">
            {completedCount}
          </div>
        </div>
        <div className="bg-[#1B1233] p-4">
          <div className="text-xs text-[#8D81B3]">Total RSVP’d</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#F6F3FF] mt-1">
            {committedCount + completedCount}
          </div>
        </div>
      </div>

      {/* Inline New Custom Ritual Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#1B1233] border border-[#B8FF3B] p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[#B8FF3B]">Create Custom Alignment Event</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#BEB4DE] mb-1">Event / Alignment Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chiron in Taurus Somatic Check-In"
                className="w-full px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#B8FF3B]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#BEB4DE] mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#BEB4DE] mb-1">Window</label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as TransitEvent['timeWindow'])}
                className="w-full px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
              >
                <option value="Dawn">Dawn</option>
                <option value="Midday">Midday</option>
                <option value="Dusk">Dusk</option>
                <option value="Night">Night</option>
                <option value="All Day">All Day</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#BEB4DE] mb-1">Ritual Name</label>
              <input
                type="text"
                value={ritualTitle}
                onChange={(e) => setRitualTitle(e.target.value)}
                placeholder="e.g. Candlelight Value & Rest Reset"
                className="w-full px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#BEB4DE] mb-1">Zodiac Resonance</label>
              <select
                value={sign}
                onChange={(e) => setSign(e.target.value as ZodiacSign)}
                className="w-full px-3 py-2 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
              >
                {ZODIAC_SIGNS.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#BEB4DE] mb-1">
              Ritual Steps (one per line)
            </label>
            <textarea
              rows={3}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={'Light cedar or candle\nJournal three honest priorities\nClose with 5 slow breaths'}
              className="w-full p-3 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-xs text-[#BEB4DE] border border-[#382864] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] cursor-pointer"
            >
              Save &amp; RSVP
            </button>
          </div>
        </form>
      )}

      {/* Segmented Filter */}
      <div className="flex items-center gap-1 p-1 bg-[#160E2C] border border-[#382864] w-fit">
        {(['all', 'committed', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filter === tab
                ? 'bg-[#38BDF8] text-[#120B24] font-semibold'
                : 'text-[#BEB4DE] hover:text-[#F6F3FF]'
            }`}
          >
            {tab === 'all' ? 'All RSVPs' : tab === 'committed' ? 'Committed' : 'Completed'}
          </button>
        ))}
      </div>

      {/* RSVP List */}
      {rsvpList.length === 0 ? (
        <div className="bg-[#1B1233] border border-[#382864] p-10 text-center space-y-2">
          <h3 className="text-base font-semibold text-[#F6F3FF]">No Committed Rituals Yet</h3>
          <p className="text-xs text-[#BEB4DE] max-w-md mx-auto">
            Click Commit on any transit, retrograde, moon phase, or natal activation in the Planner,
            or schedule a custom ritual above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rsvpList.map((ev) => {
            const c = commitments[ev.id];
            const isDone = c.status === 'completed';
            return (
              <div
                key={ev.id}
                className="bg-[#1B1233] border border-[#382864] hover:border-[#5D459B] transition-colors p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div
                  onClick={() => onSelectEvent(ev)}
                  className="space-y-1 cursor-pointer min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono tabular-nums text-[#38BDF8]">{ev.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[#BEB4DE] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.scheduledTime}
                    </span>
                    {ev.intensity === 'high' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-[#FF7A2F] font-semibold">
                          <Flame className="w-3 h-3" />
                          High Intensity
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[#F6F3FF]">{ev.ritualTitle}</h3>
                  <div className="text-xs text-[#BEB4DE]">
                    {PLANET_GLYPHS[ev.transitingPlanet]} {ev.title}
                    {c.intention && (
                      <span className="text-[#B8FF3B]"> · Intention: “{c.intention}”</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ev.id, isDone ? 'committed' : 'completed')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      isDone
                        ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B]'
                        : 'bg-[#140C28] text-[#B8FF3B] border-[#4A6B1C] hover:border-[#B8FF3B]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? 'Completed' : 'Mark Completed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ev.id, 'uncommitted')}
                    className="px-3 py-2 text-xs text-[#8D81B3] border border-[#382864] hover:text-[#FF7A2F] hover:border-[#FF7A2F] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ReflectionsViewProps {
  notes: ReflectionNote[];
  onDeleteNote: (noteId: string) => void;
  onJumpToEvent: (eventId: string, eventDate: string) => void;
}

const ALL_RESONANCES: ResonanceTag[] = ['Grounded', 'Activated', 'Breakthrough', 'Tender', 'Clear'];

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({
  notes,
  onDeleteNote,
  onJumpToEvent,
}) => {
  const [query, setQuery] = useState('');
  const [resFilter, setResFilter] = useState<ResonanceTag | 'All'>('All');

  const filtered = notes.filter((n) => {
    const matchRes = resFilter === 'All' || n.resonance === resFilter;
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      n.content.toLowerCase().includes(q) ||
      n.eventTitle.toLowerCase().includes(q) ||
      PLANET_LABELS[n.planet].toLowerCase().includes(q);
    return matchRes && matchQ;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[#382864] pb-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#F6F3FF]">
          Personal Reflection Log
        </h1>
        <p className="text-xs text-[#BEB4DE] mt-1">
          A searchable archive of insights, somatic observations, and patterns recorded across
          planetary transits.
        </p>
      </div>

      {/* Search + Resonance Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8D81B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reflections, planets, or transits..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#1B1233] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setResFilter('All')}
            className={`px-3 py-1.5 text-xs border transition-colors cursor-pointer whitespace-nowrap ${
              resFilter === 'All'
                ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B] font-semibold'
                : 'bg-[#1B1233] text-[#BEB4DE] border-[#382864] hover:border-[#B8FF3B]'
            }`}
          >
            All ({notes.length})
          </button>
          {ALL_RESONANCES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResFilter(r)}
              className={`px-3 py-1.5 text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                resFilter === r
                  ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8] font-semibold'
                  : 'bg-[#1B1233] text-[#BEB4DE] border-[#382864] hover:border-[#38BDF8]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1B1233] border border-[#382864] p-10 text-center space-y-2">
          <h3 className="text-base font-semibold text-[#F6F3FF]">No Reflections Logged Yet</h3>
          <p className="text-xs text-[#BEB4DE] max-w-md mx-auto">
            Select any transit, eclipse, or personal activation in the Planner to write your first
            reflection note.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((n) => (
            <article
              key={n.id}
              className="bg-[#1B1233] border border-[#382864] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-[#38BDF8]">{n.eventDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#B8FF3B] font-medium">{n.resonance}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(n.id)}
                    className="text-[#8D81B3] hover:text-[#FF7A2F] cursor-pointer"
                    aria-label="Delete reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onJumpToEvent(n.eventId, n.eventDate)}
                  className="text-left text-sm font-semibold text-[#F6F3FF] hover:text-[#B8FF3B] transition-colors cursor-pointer"
                >
                  {PLANET_GLYPHS[n.planet]} {n.eventTitle}
                </button>

                <p className="text-xs text-[#E4DDF8] leading-relaxed whitespace-pre-wrap">
                  {n.content}
                </p>
              </div>

              <div className="pt-2 border-t border-[#302157] text-[11px] font-mono tabular-nums text-[#8D81B3]">
                Logged{' '}
                {new Date(n.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
