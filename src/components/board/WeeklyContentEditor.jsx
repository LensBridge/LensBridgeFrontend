import { useState, useMemo, memo } from 'react';
import {
  Plus, Trash2, BookOpen, Book, Edit2, X, Save,
  Calendar, Sparkles, ChevronRight, CheckCircle2, CircleDot, Loader2,
  GripVertical, Quote
} from 'lucide-react';
import BoardService from '../../services/BoardService';

// ---------------------------------------------------------------------------
// Constants & samples
// ---------------------------------------------------------------------------

const QUOTE_KINDS = [
  { value: 'VERSE',  label: 'Verse',  icon: BookOpen, color: 'emerald' },
  { value: 'HADITH', label: 'Hadith', icon: Book,     color: 'amber' }
];

const KIND_THEME = {
  emerald: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    chipActive: 'bg-emerald-600 text-white border-emerald-600',
    icon: 'text-emerald-600'
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
    chipActive: 'bg-amber-600 text-white border-amber-600',
    icon: 'text-amber-600'
  }
};

const QUOTE_SAMPLES = {
  VERSE: [
    { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', transliteration: "Inna ma'al usri yusra", translation: 'Indeed, with hardship comes ease.', reference: 'Surah Ash-Sharh (94:6)' },
    { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', transliteration: 'Fadhkuruni adhkurkum', translation: 'So remember Me; I will remember you.', reference: 'Surah Al-Baqarah (2:152)' },
    { arabic: 'وَكَانَ اللَّهُ غَفُورًا رَّحِيمًا', transliteration: 'Wa kana Allahu Ghafuran Raheema', translation: 'And ever is Allah Forgiving and Merciful.', reference: 'Surah An-Nisa (4:96)' }
  ],
  HADITH: [
    { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', transliteration: "Innamal a'malu bin niyyat", translation: 'Actions are judged by intentions.', reference: 'Sahih al-Bukhari' },
    { arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ', transliteration: 'Tabassumuka fi wajhi akhika sadaqah', translation: 'Your smile to your brother is charity.', reference: 'Jami at-Tirmidhi' },
    { arabic: 'الدِّينُ النَّصِيحَةُ', transliteration: 'Ad-deenu an-naseeha', translation: 'The religion is sincere advice.', reference: 'Sahih Muslim' }
  ]
};

const emptyQuote = (kind = 'VERSE') => ({
  kind,
  arabic: '',
  transliteration: '',
  translation: '',
  reference: ''
});

const emptyJummahPrayer = () => ({
  prayerTime: '13:30',
  khatib: '',
  room: 'Main Musallah'
});

// ---------------------------------------------------------------------------
// Week math
// ---------------------------------------------------------------------------

const getWeek1Monday = (year) => {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Day - 1));
  return monday;
};

const getWeekStart = (weekNum, year) => {
  const start = new Date(getWeek1Monday(year));
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  return start;
};

const getCurrentWeekNumber = () => {
  const now = new Date();
  const week1 = getWeek1Monday(now.getFullYear());
  const diffDays = Math.floor((now - week1) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function WeeklyContentEditor({ weeklyContent, onUpdate, showMessage }) {
  const currentYear = new Date().getFullYear();
  const currentWeek = getCurrentWeekNumber();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Indexed lookup by year/week for O(1) access
  const contentByKey = useMemo(() => {
    const map = new Map();
    for (const c of weeklyContent || []) {
      map.set(`${c.year}-${c.weekNumber}`, c);
    }
    return map;
  }, [weeklyContent]);

  const weeksWithContent = useMemo(() => {
    const set = new Set();
    for (const c of weeklyContent || []) {
      if (c.year === selectedYear) set.add(c.weekNumber);
    }
    return set;
  }, [weeklyContent, selectedYear]);

  // Build weeks grouped by month using ISO convention (month containing the
  // week's Thursday).
  const monthsWithWeeks = useMemo(() => {
    const groups = [];
    let lastMonthIdx = -1;
    for (let week = 1; week <= 52; week++) {
      const start = getWeekStart(week, selectedYear);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const thursday = new Date(start); thursday.setDate(start.getDate() + 3);
      const monthIdx = thursday.getMonth();
      if (monthIdx !== lastMonthIdx) {
        lastMonthIdx = monthIdx;
        groups.push({
          monthIdx,
          monthLabel: thursday.toLocaleDateString('en-US', { month: 'long' }),
          weeks: []
        });
      }
      groups[groups.length - 1].weeks.push({ week, start, end });
    }
    return groups;
  }, [selectedYear]);

  const formatRange = (weekNum, year) => {
    const start = getWeekStart(weekNum, year);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Build a clean editable form from a possibly-existing content item.
  const buildForm = (year, weekNumber, existing) => ({
    year,
    weekNumber,
    quotes: existing?.quotes?.length
      ? existing.quotes.map(q => ({ ...q }))
      : [emptyQuote('VERSE'), emptyQuote('HADITH')],
    jummahPrayers: existing?.jummahPrayers?.length
      ? existing.jummahPrayers.map(p => ({ ...p }))
      : [emptyJummahPrayer()]
  });

  const handleSelectWeek = (weekNum) => {
    const existing = contentByKey.get(`${selectedYear}-${weekNum}`);
    setSelectedWeek(weekNum);
    setEditForm(buildForm(selectedYear, weekNum, existing));
    setIsEditing(!existing);
  };

  const handleJumpToCurrent = () => {
    if (selectedYear !== currentYear) setSelectedYear(currentYear);
    const existing = contentByKey.get(`${currentYear}-${currentWeek}`);
    setSelectedWeek(currentWeek);
    setEditForm(buildForm(currentYear, currentWeek, existing));
    setIsEditing(!existing);
  };

  // -------- Quote helpers --------
  const updateQuote = (index, patch) => {
    setEditForm(prev => {
      const quotes = [...prev.quotes];
      quotes[index] = { ...quotes[index], ...patch };
      return { ...prev, quotes };
    });
  };

  const addQuote = (kind) => {
    setEditForm(prev => ({ ...prev, quotes: [...prev.quotes, emptyQuote(kind)] }));
  };

  const removeQuote = (index) => {
    setEditForm(prev => ({ ...prev, quotes: prev.quotes.filter((_, i) => i !== index) }));
  };

  const moveQuote = (index, direction) => {
    setEditForm(prev => {
      const quotes = [...prev.quotes];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= quotes.length) return prev;
      [quotes[index], quotes[newIndex]] = [quotes[newIndex], quotes[index]];
      return { ...prev, quotes };
    });
  };

  const loadQuoteSample = (index) => {
    const quote = editForm.quotes[index];
    const pool = QUOTE_SAMPLES[quote.kind] || QUOTE_SAMPLES.VERSE;
    const sample = pool[Math.floor(Math.random() * pool.length)];
    updateQuote(index, sample);
  };

  // -------- Jummah helpers --------
  const updateJummah = (index, patch) => {
    setEditForm(prev => {
      const jummahPrayers = [...prev.jummahPrayers];
      jummahPrayers[index] = { ...jummahPrayers[index], ...patch };
      return { ...prev, jummahPrayers };
    });
  };

  const addJummah = () => setEditForm(prev => ({
    ...prev, jummahPrayers: [...(prev.jummahPrayers || []), emptyJummahPrayer()]
  }));

  const removeJummah = (index) => setEditForm(prev => ({
    ...prev, jummahPrayers: prev.jummahPrayers.filter((_, i) => i !== index)
  }));

  // -------- Persistence --------
  const handleSave = async () => {
    const cleanQuotes = editForm.quotes.filter(q => q.arabic.trim() || q.translation.trim());
    if (cleanQuotes.length === 0) {
      showMessage('Add at least one quote with Arabic or translation text', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await BoardService.saveWeeklyContent({
        year: editForm.year,
        weekNumber: editForm.weekNumber,
        quotes: cleanQuotes,
        jummahPrayers: editForm.jummahPrayers || []
      });

      const next = [...(weeklyContent || [])];
      const existingIdx = next.findIndex(c => c.year === saved.year && c.weekNumber === saved.weekNumber);
      if (existingIdx >= 0) next[existingIdx] = saved;
      else next.push(saved);
      onUpdate(next);

      setEditForm(buildForm(saved.year, saved.weekNumber, saved));
      setIsEditing(false);
      showMessage('Weekly content saved');
    } catch (err) {
      showMessage('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const existing = contentByKey.get(`${selectedYear}-${selectedWeek}`);
    if (!existing) return;
    if (!confirm(`Delete content for week ${selectedWeek} of ${selectedYear}?`)) return;

    setDeleting(true);
    try {
      await BoardService.deleteWeeklyContent(selectedYear, selectedWeek);
      onUpdate((weeklyContent || []).filter(c => !(c.year === selectedYear && c.weekNumber === selectedWeek)));
      setSelectedWeek(null);
      setEditForm(null);
      setIsEditing(false);
      showMessage('Content deleted');
    } catch (err) {
      showMessage('Delete failed: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    const existing = contentByKey.get(`${selectedYear}-${selectedWeek}`);
    if (!existing) {
      setSelectedWeek(null);
      setEditForm(null);
      setIsEditing(false);
    } else {
      setEditForm(buildForm(selectedYear, selectedWeek, existing));
      setIsEditing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasExisting = selectedWeek != null && contentByKey.has(`${selectedYear}-${selectedWeek}`);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ----- Week selector ----- */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:sticky lg:top-24">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-900">Select Week</span>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedWeek(null); setEditForm(null); }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={handleJumpToCurrent}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2 transition-colors"
            >
              <CircleDot className="h-4 w-4" />
              Jump to current week
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {monthsWithWeeks.map(({ monthIdx, monthLabel, weeks }) => (
              <div key={monthIdx}>
                <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  {monthLabel}
                </div>
                <ul className="divide-y divide-gray-100">
                  {weeks.map(({ week, start, end }) => {
                    const hasContent = weeksWithContent.has(week);
                    const isCurrent = week === currentWeek && selectedYear === currentYear;
                    const isSelected = week === selectedWeek;
                    const isPast = selectedYear < currentYear || (selectedYear === currentYear && week < currentWeek);
                    return (
                      <li key={week}>
                        <button
                          onClick={() => handleSelectWeek(week)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-indigo-600 text-white'
                              : isCurrent ? 'bg-amber-50 hover:bg-amber-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] leading-none font-medium ${
                            isSelected ? 'bg-white/20 text-white'
                              : isCurrent ? 'bg-amber-200 text-amber-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className="opacity-70">WK</span>
                            <span className="text-sm font-semibold mt-0.5">{week}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${
                              isSelected ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-900'
                            }`}>
                              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className={`text-xs flex items-center gap-1.5 mt-0.5 ${
                              isSelected ? 'text-indigo-100' : 'text-gray-500'
                            }`}>
                              {isCurrent && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isSelected ? 'bg-white/20' : 'bg-amber-200 text-amber-800'
                                }`}>Current</span>
                              )}
                              {hasContent ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className={`h-3 w-3 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`} />
                                  Content set
                                </span>
                              ) : (
                                <span className={isSelected ? 'text-indigo-200' : 'text-gray-400'}>Empty</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <ChevronRight className="h-4 w-4 text-white/70 flex-shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-300" /> Current</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Has content</div>
          </div>
        </div>
      </div>

      {/* ----- Content editor ----- */}
      <div className="flex-1 min-w-0">
        {!selectedWeek ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">Week {selectedWeek}, {selectedYear}</h3>
                <p className="text-sm text-gray-500">{formatRange(selectedWeek, selectedYear)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && hasExisting && (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50" title="Delete">
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 space-y-5">
              {isEditing ? (
                <EditView
                  editForm={editForm}
                  onUpdateQuote={updateQuote}
                  onAddQuote={addQuote}
                  onRemoveQuote={removeQuote}
                  onMoveQuote={moveQuote}
                  onLoadSample={loadQuoteSample}
                  onUpdateJummah={updateJummah}
                  onAddJummah={addJummah}
                  onRemoveJummah={removeJummah}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  saving={saving}
                  hasExisting={hasExisting}
                />
              ) : hasExisting ? (
                <ReadView editForm={editForm} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No content for this week yet</p>
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Content
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (declared at module scope to avoid focus-loss bugs)
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
      <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600 font-medium">Select a week to view or edit content</p>
      <p className="text-sm text-gray-400 mt-1">Choose a week from the list on the left</p>
    </div>
  );
}

function EditView({
  editForm, onUpdateQuote, onAddQuote, onRemoveQuote, onMoveQuote, onLoadSample,
  onUpdateJummah, onAddJummah, onRemoveJummah, onSave, onCancel, saving, hasExisting
}) {
  return (
    <>
      {/* Quotes */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-gray-700" />
            <h4 className="font-semibold text-gray-900">Quotes</h4>
            <span className="text-xs text-gray-500">({editForm.quotes.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {QUOTE_KINDS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onAddQuote(value)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
                Add {label}
              </button>
            ))}
          </div>
        </header>

        {editForm.quotes.length === 0 ? (
          <button
            onClick={() => onAddQuote('VERSE')}
            className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 text-sm flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add your first quote
          </button>
        ) : (
          <div className="space-y-3">
            {editForm.quotes.map((quote, i) => (
              <QuoteCard
                key={i}
                index={i}
                quote={quote}
                total={editForm.quotes.length}
                onChange={(patch) => onUpdateQuote(i, patch)}
                onRemove={() => onRemoveQuote(i)}
                onMoveUp={() => onMoveQuote(i, -1)}
                onMoveDown={() => onMoveQuote(i, 1)}
                onLoadSample={() => onLoadSample(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Jummah prayers */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-700" />
            <h4 className="font-semibold text-gray-900">Jummah Prayers</h4>
            <span className="text-xs text-gray-500">({editForm.jummahPrayers?.length || 0})</span>
          </div>
        </header>

        <div className="border border-green-200 rounded-xl bg-green-50 p-3 space-y-2">
          {(editForm.jummahPrayers || []).map((prayer, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white rounded-lg p-2 border border-gray-100">
              <input
                type="time"
                value={prayer.prayerTime}
                onChange={(e) => onUpdateJummah(i, { prayerTime: e.target.value })}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm sm:w-28 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                value={prayer.khatib}
                placeholder="Khatib"
                onChange={(e) => onUpdateJummah(i, { khatib: e.target.value })}
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                value={prayer.room}
                placeholder="Room"
                onChange={(e) => onUpdateJummah(i, { room: e.target.value })}
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={() => onRemoveJummah(i)}
                className="self-end sm:self-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                aria-label="Remove prayer time"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={onAddJummah}
            className="w-full py-2 border-2 border-dashed border-green-200 rounded-lg text-green-700 hover:border-green-400 hover:bg-green-100/50 text-sm flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add prayer time
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            : <><Save className="h-4 w-4" /> {hasExisting ? 'Save changes' : 'Create week'}</>}
        </button>
      </div>
    </>
  );
}

function QuoteCard({ index, quote, total, onChange, onRemove, onMoveUp, onMoveDown, onLoadSample }) {
  const meta = QUOTE_KINDS.find(k => k.value === quote.kind) || QUOTE_KINDS[0];
  const theme = KIND_THEME[meta.color];
  const Icon = meta.icon;

  return (
    <div className={`border rounded-xl ${theme.border} ${theme.bg}`}>
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-current/10">
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <GripVertical className="h-3 w-3 rotate-180" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        </div>

        <Icon className={`h-4 w-4 ${theme.icon}`} />

        {/* Kind selector */}
        <div className="flex items-center gap-1">
          {QUOTE_KINDS.map(({ value, label }) => {
            const isActive = quote.kind === value;
            const t = KIND_THEME[QUOTE_KINDS.find(k => k.value === value).color];
            return (
              <button
                key={value}
                onClick={() => onChange({ kind: value })}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  isActive ? t.chipActive : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onLoadSample}
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-white/60 inline-flex items-center gap-1"
            title="Load random sample"
          >
            <Sparkles className="h-3 w-3" /> Sample
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-white/60 rounded"
            aria-label="Remove quote"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        <textarea
          value={quote.arabic}
          onChange={(e) => onChange({ arabic: e.target.value })}
          dir="rtl"
          rows={2}
          placeholder="Arabic text..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg text-right bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          style={{ fontFamily: "'Amiri', serif" }}
        />
        <input
          type="text"
          value={quote.transliteration}
          onChange={(e) => onChange({ transliteration: e.target.value })}
          placeholder="Transliteration..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm italic bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <textarea
          value={quote.translation}
          onChange={(e) => onChange({ translation: e.target.value })}
          rows={2}
          placeholder="English translation..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <input
          type="text"
          value={quote.reference}
          onChange={(e) => onChange({ reference: e.target.value })}
          placeholder={quote.kind === 'HADITH' ? 'e.g., Sahih al-Bukhari' : 'e.g., Surah Al-Baqarah (2:152)'}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

function ReadView({ editForm }) {
  if (!editForm) return null;
  const quotes = editForm.quotes || [];
  const jummah = editForm.jummahPrayers || [];

  return (
    <>
      {quotes.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Quotes</h4>
          <div className="space-y-3">
            {quotes.map((q, i) => <QuoteDisplay key={i} quote={q} />)}
          </div>
        </section>
      )}
      {jummah.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Jummah Prayers</h4>
          <div className="border border-green-200 rounded-xl bg-green-50 p-3 space-y-1">
            {jummah.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-gray-100">
                <span className="font-medium tabular-nums">{p.prayerTime}</span>
                <span className="text-gray-700">{p.khatib || 'TBA'}</span>
                <span className="text-gray-500">{p.room}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function QuoteDisplay({ quote }) {
  const meta = QUOTE_KINDS.find(k => k.value === quote.kind) || QUOTE_KINDS[0];
  const theme = KIND_THEME[meta.color];
  const Icon = meta.icon;

  return (
    <div className={`border rounded-xl p-4 ${theme.border} ${theme.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${theme.icon}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${theme.icon}`}>{meta.label}</span>
      </div>
      {quote.arabic && (
        <p dir="rtl" className="text-lg mb-2 text-gray-900" style={{ fontFamily: "'Amiri', serif" }}>{quote.arabic}</p>
      )}
      {quote.transliteration && <p className="text-sm italic text-gray-600 mb-1">{quote.transliteration}</p>}
      {quote.translation && <p className="text-gray-800 mb-1">{quote.translation}</p>}
      {quote.reference && <p className="text-sm font-medium text-gray-500">{quote.reference}</p>}
    </div>
  );
}

export default memo(WeeklyContentEditor);
