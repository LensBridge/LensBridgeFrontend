import { useEffect, useMemo, useState } from 'react';
import { Book, BookOpen, ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import BoardService from '../../services/BoardService';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { QUOTE_AUTO_RANGE_LABEL, quoteDurationError } from '../../models/board';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Panel,
  SegmentedControl,
  Select,
  Textarea,
  useToast,
} from '../ui';

const QUOTE_KINDS = [
  { value: 'VERSE', label: 'Verse', icon: BookOpen },
  { value: 'HADITH', label: 'Hadith', icon: Book },
];

/**
 * Starter text, so a new week is one click from something legible on a wall
 * rather than a blank Arabic field and a hunt for a reference format.
 */
const SAMPLES = {
  VERSE: [
    {
      arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      transliteration: "Inna ma'al usri yusra",
      translation: 'Indeed, with hardship comes ease.',
      reference: 'Surah Ash-Sharh (94:6)',
    },
    {
      arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
      transliteration: 'Fadhkuruni adhkurkum',
      translation: 'So remember Me; I will remember you.',
      reference: 'Surah Al-Baqarah (2:152)',
    },
    {
      arabic: 'وَكَانَ اللَّهُ غَفُورًا رَّحِيمًا',
      transliteration: 'Wa kana Allahu Ghafuran Raheema',
      translation: 'And ever is Allah Forgiving and Merciful.',
      reference: 'Surah An-Nisa (4:96)',
    },
  ],
  HADITH: [
    {
      arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
      transliteration: "Innamal a'malu bin niyyat",
      translation: 'Actions are judged by intentions.',
      reference: 'Sahih al-Bukhari',
    },
    {
      arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
      transliteration: 'Tabassumuka fi wajhi akhika sadaqah',
      translation: 'Your smile to your brother is charity.',
      reference: 'Jami at-Tirmidhi',
    },
    {
      arabic: 'الدِّينُ النَّصِيحَةُ',
      transliteration: 'Ad-deenu an-naseeha',
      translation: 'The religion is sincere advice.',
      reference: 'Sahih Muslim',
    },
  ],
};

const emptyQuote = (kind = 'VERSE') => ({
  kind,
  arabic: '',
  transliteration: '',
  translation: '',
  reference: '',
  // null, not 0 or '': a new quote is auto-timed until someone says otherwise.
  durationSeconds: null,
});

const emptyJummah = () => ({ prayerTime: '13:30', khatib: '', room: 'Main Musallah' });

/* ------------------------------------------------------------------ *
 * Week math — ISO-ish weeks starting Monday, anchored on Jan 4.
 * ------------------------------------------------------------------ */

function week1Monday(year) {
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (day - 1));
  return monday;
}

function weekStart(weekNumber, year) {
  const start = new Date(week1Monday(year));
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  return start;
}

function currentWeekNumber() {
  const now = new Date();
  const first = week1Monday(now.getFullYear());
  return Math.max(1, Math.floor(Math.floor((now - first) / 86_400_000) / 7) + 1);
}

const weekLabel = (weekNumber, year) => {
  const start = weekStart(weekNumber, year);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

/* ------------------------------------------------------------------ */

/**
 * The verse, hadith and Jummah details for one week.
 *
 * Weeks are picked from a grid rather than a dropdown. Weekly content is only
 * legible as a *calendar* — the question is always "which of the next six weeks
 * has nothing in it yet", and a select box makes that a click-by-click search.
 * Filled weeks carry an ember dot; the current week is outlined.
 *
 * A save replaces the whole week (`PUT`), so the editor holds a complete draft
 * and sends it in one piece. There is no field-level patching to get wrong.
 */
export default function WeeklyContentEditor({ weeklyContent, onUpdate }) {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can(PERMISSIONS.BOARD_WEEKLY_WRITE);

  const thisYear = new Date().getFullYear();
  const thisWeek = currentWeekNumber();

  const [year, setYear] = useState(thisYear);
  const [week, setWeek] = useState(thisWeek);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const list = useMemo(() => weeklyContent ?? [], [weeklyContent]);

  const byKey = useMemo(() => {
    const map = new Map();
    for (const item of list) map.set(`${item.year}-${item.weekNumber}`, item);
    return map;
  }, [list]);

  const stored = byKey.get(`${year}-${week}`) ?? null;

  // Reset the draft whenever the selection moves, so an abandoned edit on one
  // week cannot leak into another. Saved content re-seeds it after a write.
  useEffect(() => {
    setDraft(null);
  }, [year, week]);

  const editing = draft !== null;
  const shown = draft ?? stored;

  const beginEdit = () => {
    setDraft({
      year,
      weekNumber: week,
      quotes: stored?.quotes?.length ? stored.quotes.map((q) => ({ ...q })) : [emptyQuote()],
      jummahPrayers: stored?.jummahPrayers?.length
        ? stored.jummahPrayers.map((p) => ({ ...p }))
        : [emptyJummah()],
    });
  };

  const patchQuote = (index, patch) =>
    setDraft((d) => ({
      ...d,
      quotes: d.quotes.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));

  const moveQuote = (index, delta) =>
    setDraft((d) => {
      const next = [...d.quotes];
      const target = index + delta;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, quotes: next };
    });

  const save = async () => {
    const usable = draft.quotes.filter((q) => q.arabic.trim() || q.translation.trim());
    const bad = usable.findIndex((q) => quoteDurationError(q.durationSeconds));
    if (bad !== -1) {
      toast.error(`Quote ${bad + 1}: ${quoteDurationError(usable[bad].durationSeconds)}`);
      return;
    }

    setSaving(true);
    try {
      const saved = await BoardService.saveWeeklyContent({ ...draft, quotes: usable });
      const next = list.filter((c) => !(c.year === saved.year && c.weekNumber === saved.weekNumber));
      onUpdate([...next, saved]);
      setDraft(null);
      toast.success(`Week ${saved.weekNumber} saved.`);
    } catch (err) {
      toast.error('Could not save the week.', { detail: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await BoardService.deleteWeeklyContent(year, week);
    onUpdate(list.filter((c) => !(c.year === year && c.weekNumber === week)));
    setDraft(null);
    toast.success('Week cleared.');
  };

  return (
    <div className="space-y-5">
      <Panel
        caption="Calendar"
        title={`${year} · week ${week}`}
        actions={
          <Select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28"
            aria-label="Year"
          >
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      >
        <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-13 gap-1.5">
          {Array.from({ length: 53 }, (_, i) => i + 1).map((w) => {
            const filled = byKey.has(`${year}-${w}`);
            const isNow = year === thisYear && w === thisWeek;
            const active = w === week;
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                title={weekLabel(w, year)}
                className={[
                  'relative h-9 rounded-md text-[12px] tabular transition-colors border',
                  active
                    ? 'bg-ember text-on-ember border-ember font-semibold'
                    : isNow
                      ? 'bg-raised text-ink border-ember/50'
                      : 'bg-raised text-muted border-transparent hover:border-line hover:text-ink',
                ].join(' ')}
              >
                {w}
                {filled && !active && (
                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-ember" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-muted">
          {weekLabel(week, year)}
          {year === thisYear && week === thisWeek && (
            <span className="text-ember"> · this week</span>
          )}
          <span className="text-faint"> · a dot marks a week with content</span>
        </p>
      </Panel>

      <Panel
        caption={stored ? 'Saved' : 'Empty'}
        title={editing ? `Editing week ${week}` : `Week ${week} content`}
        actions={
          canWrite &&
          (editing ? (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} loading={saving}>
                Save week
              </Button>
            </>
          ) : (
            <>
              {stored && (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="text-faint hover:text-bad"
                  onClick={() => setConfirmDelete(true)}
                >
                  Clear
                </Button>
              )}
              <Button variant="primary" onClick={beginEdit}>
                {stored ? 'Edit' : 'Add content'}
              </Button>
            </>
          ))
        }
      >
        {!editing && !stored && (
          <EmptyState
            icon={BookOpen}
            title="Nothing set for this week"
            body="Boards fall back to their own defaults when a week has no content, so an empty week is safe — just less interesting."
            action={
              canWrite ? (
                <Button variant="primary" icon={Plus} onClick={beginEdit}>
                  Add content
                </Button>
              ) : null
            }
          />
        )}

        {!editing && stored && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="cap mb-3">Quotes</p>
              <div className="space-y-3">
                {shown.quotes.length === 0 && (
                  <p className="text-[13px] text-muted">No quotes for this week.</p>
                )}
                {shown.quotes.map((quote, i) => (
                  <div key={i} className="bg-raised border border-hair rounded-md px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="quiet" size="sm">
                        {quote.kind === 'HADITH' ? 'Hadith' : 'Verse'}
                      </Badge>
                      <span className="text-[11px] text-faint tabular">
                        {quote.durationSeconds ? `${quote.durationSeconds}s` : 'auto'}
                      </span>
                    </div>
                    {quote.arabic && (
                      <p
                        dir="rtl"
                        className="mt-2.5 text-[17px] leading-loose text-ink"
                        style={{ fontFamily: "'Amiri', serif" }}
                      >
                        {quote.arabic}
                      </p>
                    )}
                    {quote.transliteration && (
                      <p className="mt-1.5 text-[12px] italic text-muted">{quote.transliteration}</p>
                    )}
                    {quote.translation && (
                      <p className="mt-1.5 text-[13px] text-soft leading-relaxed">
                        {quote.translation}
                      </p>
                    )}
                    {quote.reference && <p className="mt-1.5 cap">{quote.reference}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="cap mb-3">Jummah</p>
              <div className="space-y-2">
                {shown.jummahPrayers.length === 0 && (
                  <p className="text-[13px] text-muted">No Jummah slots for this week.</p>
                )}
                {shown.jummahPrayers.map((prayer, i) => (
                  <div
                    key={i}
                    className="bg-raised border border-hair rounded-md px-4 py-3 flex items-center gap-4"
                  >
                    <span className="font-display text-lg text-ink tabular shrink-0">
                      {prayer.prayerTime}
                    </span>
                    <div className="min-w-0">
                      {prayer.khatib && (
                        <p className="text-[13px] text-ink truncate">{prayer.khatib}</p>
                      )}
                      {prayer.room && <p className="text-[12px] text-muted truncate">{prayer.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="cap">Quotes</p>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setDraft((d) => ({ ...d, quotes: [...d.quotes, emptyQuote()] }))}
                >
                  Add quote
                </Button>
              </div>

              <div className="space-y-4">
                {draft.quotes.map((quote, index) => {
                  const durationError = quoteDurationError(quote.durationSeconds);
                  return (
                    <div
                      key={index}
                      className="bg-raised border border-hair rounded-lg px-4 py-4 space-y-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <SegmentedControl
                          size="sm"
                          value={quote.kind}
                          onChange={(kind) => patchQuote(index, { kind })}
                          options={QUOTE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={Sparkles}
                          onClick={() => {
                            const pool = SAMPLES[quote.kind];
                            patchQuote(index, pool[Math.floor(Math.random() * pool.length)]);
                          }}
                        >
                          Sample
                        </Button>

                        <div className="ml-auto flex items-center gap-0.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            icon={ChevronUp}
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => moveQuote(index, -1)}
                          />
                          <Button
                            size="xs"
                            variant="ghost"
                            icon={ChevronDown}
                            aria-label="Move down"
                            disabled={index === draft.quotes.length - 1}
                            onClick={() => moveQuote(index, 1)}
                          />
                          <Button
                            size="xs"
                            variant="ghost"
                            icon={Trash2}
                            aria-label="Remove quote"
                            className="text-faint hover:text-bad"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                quotes: d.quotes.filter((_, i) => i !== index),
                              }))
                            }
                          />
                        </div>
                      </div>

                      <Field label="Arabic">
                        <Textarea
                          dir="rtl"
                          rows={2}
                          value={quote.arabic}
                          onChange={(e) => patchQuote(index, { arabic: e.target.value })}
                          className="text-[18px] leading-loose"
                          style={{ fontFamily: "'Amiri', serif" }}
                        />
                      </Field>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Transliteration">
                          <Input
                            value={quote.transliteration}
                            onChange={(e) =>
                              patchQuote(index, { transliteration: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Reference">
                          <Input
                            value={quote.reference}
                            placeholder="Surah Al-Baqarah (2:152)"
                            onChange={(e) => patchQuote(index, { reference: e.target.value })}
                          />
                        </Field>
                      </div>

                      <Field label="Translation">
                        <Textarea
                          rows={2}
                          value={quote.translation}
                          onChange={(e) => patchQuote(index, { translation: e.target.value })}
                        />
                      </Field>

                      <Field
                        label="Seconds on screen"
                        error={durationError || undefined}
                        hint={durationError ? undefined : `Leave blank for auto — ${QUOTE_AUTO_RANGE_LABEL}.`}
                      >
                        <Input
                          type="number"
                          min="5"
                          max="120"
                          className="max-w-[10rem]"
                          placeholder="auto"
                          error={durationError || undefined}
                          value={quote.durationSeconds ?? ''}
                          onChange={(e) =>
                            patchQuote(index, {
                              // '' is auto; the server rejects both 0 and '', so
                              // null is the only way to say it.
                              durationSeconds:
                                e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="cap">Jummah</p>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    setDraft((d) => ({ ...d, jummahPrayers: [...d.jummahPrayers, emptyJummah()] }))
                  }
                >
                  Add slot
                </Button>
              </div>

              <div className="space-y-2">
                {draft.jummahPrayers.map((prayer, index) => (
                  <div
                    key={index}
                    className="bg-raised border border-hair rounded-md px-4 py-3 grid gap-3 sm:grid-cols-[8rem_1fr_1fr_auto] items-end"
                  >
                    <Field label="Time">
                      <Input
                        type="time"
                        value={prayer.prayerTime}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            jummahPrayers: d.jummahPrayers.map((p, i) =>
                              i === index ? { ...p, prayerTime: e.target.value } : p
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Khatib">
                      <Input
                        value={prayer.khatib}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            jummahPrayers: d.jummahPrayers.map((p, i) =>
                              i === index ? { ...p, khatib: e.target.value } : p
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Room">
                      <Input
                        value={prayer.room}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            jummahPrayers: d.jummahPrayers.map((p, i) =>
                              i === index ? { ...p, room: e.target.value } : p
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      aria-label="Remove slot"
                      className="text-faint hover:text-bad mb-0.5"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          jummahPrayers: d.jummahPrayers.filter((_, i) => i !== index),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={`Clear week ${week}?`}
        confirmLabel="Clear the week"
        body="Every quote and Jummah slot stored for this week is deleted. Boards fall back to their own defaults."
      />
    </div>
  );
}
