import { useState, useMemo, memo } from 'react';
import { 
  Plus, Trash2, BookOpen, Book, Edit2, X,
  Calendar, Sparkles, ChevronRight
} from 'lucide-react';

/**
 * WeeklyContentEditor - Clean weekly content management
 */
function WeeklyContentEditor({ weeklyContent, onUpdate, showMessage }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Calculate current week
  const getCurrentWeek = () => {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
    const diffDays = Math.floor((now - week1Monday) / (24 * 60 * 60 * 1000));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  const currentWeek = getCurrentWeek();
  const currentYear = new Date().getFullYear();

  // Get week date range
  const getWeekRange = (weekNum, year) => {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
    const weekStart = new Date(week1Monday);
    weekStart.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Filter content by year
  const yearContent = useMemo(() => {
    return weeklyContent.filter(c => c.year === selectedYear).sort((a, b) => a.weekNumber - b.weekNumber);
  }, [weeklyContent, selectedYear]);

  // Get weeks with content
  const weeksWithContent = new Set(yearContent.map(c => c.weekNumber));

  // Sample content
  const samples = {
    verse: [
      { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', transliteration: "Inna ma'al usri yusra", translation: 'Indeed, with hardship comes ease.', reference: 'Surah Ash-Sharh (94:6)' },
      { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', transliteration: 'Fadhkuruni adhkurkum', translation: 'So remember Me; I will remember you.', reference: 'Surah Al-Baqarah (2:152)' }
    ],
    hadith: [
      { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', transliteration: "Innamal a'malu bin niyyat", translation: 'Actions are judged by intentions.', reference: 'Sahih Bukhari' },
      { arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ', transliteration: 'Tabassumuka fi wajhi akhika sadaqah', translation: 'Your smile to your brother is charity.', reference: 'Jami at-Tirmidhi' }
    ]
  };

  const getEmptyForm = (weekNum) => ({
    weekNumber: weekNum,
    year: selectedYear,
    verse: { arabic: '', transliteration: '', translation: '', reference: '' },
    hadith: { arabic: '', transliteration: '', translation: '', reference: '' },
    jummahPrayers: [{ time: '13:30', khatib: '', location: 'Main Musallah' }]
  });

  const handleSelectWeek = (weekNum) => {
    const existing = yearContent.find(c => c.weekNumber === weekNum);
    setSelectedWeek(weekNum);
    if (existing) {
      setEditForm({ ...existing });
      setIsEditing(false);
    } else {
      setEditForm(getEmptyForm(weekNum));
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editForm.verse.arabic && !editForm.hadith.arabic) {
      showMessage('Add at least a verse or hadith', true);
      return;
    }
    const existing = weeklyContent.find(c => c.weekNumber === editForm.weekNumber && c.year === editForm.year);
    if (existing) {
      onUpdate(weeklyContent.map(c => c.id === existing.id ? { ...editForm, id: existing.id } : c));
    } else {
      onUpdate([...weeklyContent, { ...editForm, id: Date.now() }]);
    }
    showMessage('Content saved');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm('Delete this week\'s content?')) return;
    const existing = yearContent.find(c => c.weekNumber === selectedWeek);
    if (existing) {
      onUpdate(weeklyContent.filter(c => c.id !== existing.id));
      setSelectedWeek(null);
      setEditForm(null);
      showMessage('Content deleted');
    }
  };

  const loadSample = (type) => {
    const sample = samples[type][Math.floor(Math.random() * samples[type].length)];
    setEditForm({ ...editForm, [type]: sample });
    showMessage('Sample loaded');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Week Selector Panel */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Year Selector */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Select Week</span>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedWeek(null); }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Week Grid */}
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-gray-400 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => {
                const hasContent = weeksWithContent.has(week);
                const isCurrent = week === currentWeek && selectedYear === currentYear;
                const isSelected = week === selectedWeek;
                const isPast = selectedYear < currentYear || (selectedYear === currentYear && week < currentWeek);
                return (
                  <button
                    key={week}
                    onClick={() => handleSelectWeek(week)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                      isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' :
                      isCurrent ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' :
                      hasContent ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                      isPast ? 'bg-gray-50 text-gray-400 hover:bg-gray-100' :
                      'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {week}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Current</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100" /> Has Content</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Editor Panel */}
      <div className="flex-1 min-w-0">
        {!selectedWeek ? (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">Select a week to view or edit content</p>
            <p className="text-sm text-gray-400 mt-1">Click a week number on the left</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Week {selectedWeek}</h3>
                <p className="text-sm text-gray-500">{getWeekRange(selectedWeek, selectedYear)}, {selectedYear}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && weeksWithContent.has(selectedWeek) && (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {isEditing ? (
                <>
                  {/* Verse Editor */}
                  <ContentSection
                    title="Verse of the Day"
                    icon={BookOpen}
                    color="emerald"
                    data={editForm.verse}
                    onChange={(field, val) => setEditForm({ ...editForm, verse: { ...editForm.verse, [field]: val } })}
                    onLoadSample={() => loadSample('verse')}
                  />

                  {/* Hadith Editor */}
                  <ContentSection
                    title="Hadith of the Day"
                    icon={Book}
                    color="amber"
                    data={editForm.hadith}
                    onChange={(field, val) => setEditForm({ ...editForm, hadith: { ...editForm.hadith, [field]: val } })}
                    onLoadSample={() => loadSample('hadith')}
                  />

                  {/* Jummah Prayers */}
                  <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                    <h4 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4" />
                      Jummah Prayers
                    </h4>
                    <div className="space-y-2">
                      {editForm.jummahPrayers?.map((prayer, i) => (
                        <div key={i} className="flex gap-2 items-center bg-white rounded-lg p-2 border border-gray-100">
                          <input type="time" value={prayer.time} onChange={(e) => {
                            const updated = [...editForm.jummahPrayers];
                            updated[i] = { ...updated[i], time: e.target.value };
                            setEditForm({ ...editForm, jummahPrayers: updated });
                          }} className="border border-gray-200 rounded px-2 py-1 text-sm w-28" />
                          <input type="text" value={prayer.khatib} placeholder="Khatib" onChange={(e) => {
                            const updated = [...editForm.jummahPrayers];
                            updated[i] = { ...updated[i], khatib: e.target.value };
                            setEditForm({ ...editForm, jummahPrayers: updated });
                          }} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm" />
                          <input type="text" value={prayer.location} placeholder="Location" onChange={(e) => {
                            const updated = [...editForm.jummahPrayers];
                            updated[i] = { ...updated[i], location: e.target.value };
                            setEditForm({ ...editForm, jummahPrayers: updated });
                          }} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm" />
                          <button onClick={() => setEditForm({ ...editForm, jummahPrayers: editForm.jummahPrayers.filter((_, idx) => idx !== i) })} className="p-1 text-gray-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setEditForm({ ...editForm, jummahPrayers: [...(editForm.jummahPrayers || []), { time: '13:30', khatib: '', location: '' }] })} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-green-400 hover:text-green-600 text-sm flex items-center justify-center gap-1">
                        <Plus className="h-4 w-4" /> Add Prayer Time
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => { setIsEditing(false); if (!weeksWithContent.has(selectedWeek)) setSelectedWeek(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" /> Save Content
                    </button>
                  </div>
                </>
              ) : weeksWithContent.has(selectedWeek) ? (
                <>
                  {/* Verse Display */}
                  <ContentDisplay title="Verse" icon={BookOpen} color="emerald" data={editForm?.verse} />
                  {/* Hadith Display */}
                  <ContentDisplay title="Hadith" icon={Book} color="amber" data={editForm?.hadith} />
                  {/* Jummah Display */}
                  {editForm?.jummahPrayers?.length > 0 && (
                    <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                      <h4 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4" /> Jummah Prayers
                      </h4>
                      <div className="space-y-1">
                        {editForm.jummahPrayers.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium">{p.time}</span>
                            <span className="text-gray-600">{p.khatib || 'TBA'}</span>
                            <span className="text-gray-500">{p.location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
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

// Reusable content section editor
function ContentSection({ title, icon: Icon, color, data, onChange, onLoadSample }) {
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800'
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" /> {title}
        </h4>
        <button onClick={onLoadSample} className="text-xs hover:underline flex items-center gap-1 opacity-70 hover:opacity-100">
          <Sparkles className="h-3 w-3" /> Load Sample
        </button>
      </div>
      <div className="space-y-2">
        <textarea value={data.arabic} onChange={(e) => onChange('arabic', e.target.value)} dir="rtl" rows={2} placeholder="Arabic text..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg text-right bg-white focus:ring-2 focus:ring-indigo-500" style={{ fontFamily: "'Amiri', serif" }} />
        <input type="text" value={data.transliteration} onChange={(e) => onChange('transliteration', e.target.value)} placeholder="Transliteration..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm italic bg-white" />
        <textarea value={data.translation} onChange={(e) => onChange('translation', e.target.value)} rows={2} placeholder="English translation..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
        <input type="text" value={data.reference} onChange={(e) => onChange('reference', e.target.value)} placeholder="Reference (e.g., Surah Al-Baqarah 2:152)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
      </div>
    </div>
  );
}

// Content display
function ContentDisplay({ title, icon: Icon, color, data }) {
  if (!data?.arabic && !data?.translation) return null;
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800'
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <h4 className="font-medium flex items-center gap-2 mb-3"><Icon className="h-4 w-4" /> {title}</h4>
      {data.arabic && <p dir="rtl" className="text-lg mb-2" style={{ fontFamily: "'Amiri', serif" }}>{data.arabic}</p>}
      {data.transliteration && <p className="text-sm italic text-gray-600 mb-1">{data.transliteration}</p>}
      {data.translation && <p className="text-gray-800 mb-1">{data.translation}</p>}
      {data.reference && <p className="text-sm font-medium opacity-70">{data.reference}</p>}
    </div>
  );
}

export default memo(WeeklyContentEditor);
