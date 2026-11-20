import React, { useState } from 'react';
import {
  Check,
  Clock,
  Flame,
  Plus,
  Trash2,
  X,
  CalendarCheck,
  BookOpen,
} from 'lucide-react';
import { HOUSE_THEMES, PLANET_GLYPHS, PLANET_LABELS, ZODIAC_GLYPHS } from '../data/presets';
import { formatDegree } from '../engine/ephemeris';
import {
  CategoryTag,
  ReflectionNote,
  ResonanceTag,
  RitualCommitment,
  RitualStatus,
  TransitEvent,
} from '../types/astrology';

interface EventDetailPanelProps {
  event: TransitEvent;
  commitment?: RitualCommitment;
  notes: ReflectionNote[];
  allTags: CategoryTag[];
  assignedTags: string[];
  onClose: () => void;
  onUpdateCommitment: (eventId: string, next: RitualCommitment) => void;
  onToggleTag: (eventId: string, tagId: string) => void;
  onCreateTag: (label: string, tone: 'lime' | 'sky' | 'orange') => string;
  onAddNote: (note: Omit<ReflectionNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
}

const RESONANCE_OPTIONS: ResonanceTag[] = ['Grounded', 'Activated', 'Breakthrough', 'Tender', 'Clear'];

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  event,
  commitment,
  notes,
  allTags,
  assignedTags,
  onClose,
  onUpdateCommitment,
  onToggleTag,
  onCreateTag,
  onAddNote,
  onDeleteNote,
}) => {
  const [noteDraft, setNoteDraft] = useState('');
  const [resonance, setResonance] = useState<ResonanceTag>('Grounded');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagTone, setNewTagTone] = useState<'lime' | 'sky' | 'orange'>('lime');
  const [addingTag, setAddingTag] = useState(false);

  const currentStatus: RitualStatus = commitment?.status ?? 'uncommitted';
  const currentTime = commitment?.scheduledTime ?? '20:00';
  const currentIntention = commitment?.intention ?? '';
  const completedSteps = commitment?.completedSteps ?? [];

  const updateStatus = (status: RitualStatus) => {
    onUpdateCommitment(event.id, {
      eventId: event.id,
      status,
      scheduledTime: currentTime,
      intention: currentIntention,
      completedSteps,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleStep = (stepIdx: number) => {
    const nextSteps = completedSteps.includes(stepIdx)
      ? completedSteps.filter((i) => i !== stepIdx)
      : [...completedSteps, stepIdx];
    const allDone = nextSteps.length === event.ritualSteps.length;
    onUpdateCommitment(event.id, {
      eventId: event.id,
      status: allDone ? 'completed' : currentStatus === 'uncommitted' ? 'committed' : currentStatus,
      scheduledTime: currentTime,
      intention: currentIntention,
      completedSteps: nextSteps,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    onAddNote({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      category: event.category,
      planet: event.transitingPlanet,
      content: noteDraft.trim(),
      resonance,
    });
    setNoteDraft('');
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagLabel.trim()) return;
    const id = onCreateTag(newTagLabel.trim(), newTagTone);
    onToggleTag(event.id, id);
    setNewTagLabel('');
    setAddingTag(false);
  };

  const houseInfo = HOUSE_THEMES[event.houseActivated];

  return (
    <aside
      className="bg-[#1B1233] border border-[#382864] flex flex-col h-full overflow-hidden"
      aria-label="Transit event details"
    >
      {/* Top Rule for High Intensity */}
      {event.intensity === 'high' && <div className="h-1 w-full bg-[#FF7A2F]" />}

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#382864] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#BEB4DE] mb-1">
            <span className="font-mono tabular-nums text-[#38BDF8]">
              {event.date}
              {event.endDate ? ` → ${event.endDate}` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span>{event.timeWindow}</span>
            {event.intensity === 'high' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#FF7A2F] font-semibold">
                  <Flame className="w-3.5 h-3.5" />
                  High Intensity
                </span>
              </>
            )}
          </div>
          <h3 className="text-lg font-semibold text-[#F6F3FF] leading-snug">{event.title}</h3>
          <p className="text-xs text-[#BEB4DE] mt-1">{event.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#8D81B3] hover:text-[#F6F3FF] hover:bg-[#291C4D] transition-colors cursor-pointer shrink-0"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Ephemeris Telemetry Grid */}
        <div className="grid grid-cols-2 gap-px bg-[#382864] border border-[#382864]">
          <div className="bg-[#140C28] p-3">
            <div className="text-[11px] text-[#8D81B3]">Transiting Body</div>
            <div className="text-sm font-mono tabular-nums text-[#F6F3FF] mt-0.5">
              {PLANET_GLYPHS[event.transitingPlanet]} {PLANET_LABELS[event.transitingPlanet]} ·{' '}
              {formatDegree(event.transitingDegree)} {ZODIAC_GLYPHS[event.transitingSign]}{' '}
              {event.transitingSign}
            </div>
          </div>
          <div className="bg-[#140C28] p-3">
            <div className="text-[11px] text-[#8D81B3]">Natal House Activated</div>
            <div className="text-sm font-mono tabular-nums text-[#B8FF3B] mt-0.5">
              {houseInfo.name}
            </div>
            <div className="text-[11px] text-[#BEB4DE] truncate">{houseInfo.focus}</div>
          </div>
          {event.natalPlanet && event.aspect && (
            <>
              <div className="bg-[#140C28] p-3">
                <div className="text-[11px] text-[#8D81B3]">Aspect Geometry</div>
                <div className="text-sm font-mono tabular-nums text-[#FF7A2F] mt-0.5">
                  {event.aspect} ({event.orb !== undefined ? formatDegree(event.orb) : 'Exact'} orb)
                </div>
              </div>
              <div className="bg-[#140C28] p-3">
                <div className="text-[11px] text-[#8D81B3]">Natal Placement</div>
                <div className="text-sm font-mono tabular-nums text-[#38BDF8] mt-0.5">
                  {PLANET_GLYPHS[event.natalPlanet]} {PLANET_LABELS[event.natalPlanet]} ·{' '}
                  {event.natalDegree !== undefined ? formatDegree(event.natalDegree) : ''}{' '}
                  {event.natalSign}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <div>
          <p className="text-sm text-[#E4DDF8] leading-relaxed">{event.summary}</p>
        </div>

        {/* Interactive Category Chips */}
        <div className="pt-4 border-t border-[#382864]">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-semibold text-[#F6F3FF]">Personal Categories</h4>
            <button
              type="button"
              onClick={() => setAddingTag(!addingTag)}
              className="inline-flex items-center gap-1 text-xs text-[#38BDF8] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New category
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = assignedTags.includes(tag.id);
              const toneStyles =
                tag.tone === 'lime'
                  ? active
                    ? 'bg-[#B8FF3B] text-[#120B24] border-[#B8FF3B] font-semibold'
                    : 'bg-[#140C28] text-[#B8FF3B] border-[#3E5918] hover:border-[#B8FF3B]'
                  : tag.tone === 'sky'
                  ? active
                    ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8] font-semibold'
                    : 'bg-[#140C28] text-[#38BDF8] border-[#1A4B66] hover:border-[#38BDF8]'
                  : active
                  ? 'bg-[#FF7A2F] text-[#120B24] border-[#FF7A2F] font-semibold'
                  : 'bg-[#140C28] text-[#FF7A2F] border-[#663114] hover:border-[#FF7A2F]';

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleTag(event.id, tag.id)}
                  className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer whitespace-nowrap ${toneStyles}`}
                >
                  {active ? '✓ ' : ''}
                  {tag.label}
                </button>
              );
            })}
          </div>

          {addingTag && (
            <form onSubmit={handleAddCustomTag} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="Category name..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#B8FF3B]"
              />
              <select
                value={newTagTone}
                onChange={(e) => setNewTagTone(e.target.value as 'lime' | 'sky' | 'orange')}
                className="px-2 py-1.5 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
              >
                <option value="lime">Lime</option>
                <option value="sky">Sky Blue</option>
                <option value="orange">Orange</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] cursor-pointer whitespace-nowrap"
              >
                Add
              </button>
            </form>
          )}
        </div>

        {/* Alignment Ritual RSVP & Commitment */}
        <div className="pt-4 border-t border-[#382864] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#F6F3FF] inline-flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-[#B8FF3B]" />
              Alignment Ritual RSVP
            </h4>
            <span className="text-xs font-mono text-[#8D81B3] inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.ritualDuration}
            </span>
          </div>

          <div className="text-sm font-medium text-[#B8FF3B]">{event.ritualTitle}</div>

          {/* 3-State Segmented RSVP Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#120B24] border border-[#382864]">
            {(['uncommitted', 'committed', 'completed'] as RitualStatus[]).map((st) => {
              const active = currentStatus === st;
              const label =
                st === 'uncommitted' ? 'Not RSVP’d' : st === 'committed' ? 'Committed' : 'Completed';
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateStatus(st)}
                  className={`py-2 px-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? st === 'completed'
                        ? 'bg-[#B8FF3B] text-[#120B24] font-semibold'
                        : st === 'committed'
                        ? 'bg-[#38BDF8] text-[#120B24] font-semibold'
                        : 'bg-[#291C4D] text-[#F6F3FF]'
                      : 'text-[#8D81B3] hover:text-[#F6F3FF]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Scheduled Time & Intention when Committed/Completed */}
          {currentStatus !== 'uncommitted' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-[#8D81B3] mb-1">Ritual Time</label>
                <input
                  type="time"
                  value={currentTime}
                  onChange={(e) =>
                    onUpdateCommitment(event.id, {
                      eventId: event.id,
                      status: currentStatus,
                      scheduledTime: e.target.value,
                      intention: currentIntention,
                      completedSteps,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#120B24] border border-[#382864] text-[#F6F3FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8D81B3] mb-1">Personal Intention</label>
                <input
                  type="text"
                  value={currentIntention}
                  onChange={(e) =>
                    onUpdateCommitment(event.id, {
                      eventId: event.id,
                      status: currentStatus,
                      scheduledTime: currentTime,
                      intention: e.target.value,
                      completedSteps,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  placeholder="e.g. Ground my boundaries around creative energy"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>
          )}

          {/* Actionable Ritual Checklist */}
          <ul className="space-y-2">
            {event.ritualSteps.map((step, idx) => {
              const checked = completedSteps.includes(idx);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => toggleStep(idx)}
                    className="w-full text-left flex items-start gap-2.5 p-2.5 bg-[#140C28] border border-[#302157] hover:border-[#533D8F] transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center border ${
                        checked
                          ? 'bg-[#B8FF3B] border-[#B8FF3B] text-[#120B24]'
                          : 'border-[#6A58A3] text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span
                      className={`text-xs leading-relaxed ${
                        checked ? 'line-through text-[#8D81B3]' : 'text-[#E4DDF8]'
                      }`}
                    >
                      {step}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Personal Reflection Notes */}
        <div className="pt-4 border-t border-[#382864] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#F6F3FF] inline-flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#38BDF8]" />
              Personal Reflection Notes ({notes.length})
            </h4>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {RESONANCE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setResonance(tag)}
                  className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer whitespace-nowrap ${
                    resonance === tag
                      ? 'bg-[#38BDF8] text-[#120B24] border-[#38BDF8] font-semibold'
                      : 'bg-[#140C28] text-[#BEB4DE] border-[#382864] hover:border-[#38BDF8]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Log physical sensations, dreams, conversations, or breakthroughs during this transit..."
              className="w-full p-3 text-xs bg-[#120B24] border border-[#382864] text-[#F6F3FF] placeholder:text-[#75689E] focus:outline-none focus:border-[#B8FF3B] resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!noteDraft.trim()}
                className="px-4 py-2 text-xs font-semibold bg-[#B8FF3B] text-[#120B24] disabled:opacity-40 hover:bg-[#CAFF6B] transition-colors cursor-pointer whitespace-nowrap"
              >
                Save Reflection
              </button>
            </div>
          </form>

          {notes.length > 0 && (
            <div className="space-y-2 pt-1">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="p-3 bg-[#140C28] border border-[#302157] space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#8D81B3]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#38BDF8] font-medium">{n.resonance}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(n.id)}
                      className="text-[#8D81B3] hover:text-[#FF7A2F] cursor-pointer"
                      aria-label="Delete reflection note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#E4DDF8] leading-relaxed whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
