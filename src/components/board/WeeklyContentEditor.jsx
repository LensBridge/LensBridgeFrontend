import { useState, memo } from 'react';
import { 
  Plus, Trash2, BookOpen, Book, Copy, Check,
  ChevronDown, ChevronUp, Eye, Sparkles, Calendar
} from 'lucide-react';

/**
 * WeeklyContentEditor - Manage weekly verses and hadiths
 * Allows specifying content for each week of the year (1-52)
 */
function WeeklyContentEditor({ weeklyContent, onUpdate, showMessage }) {
  const [editingWeek, setEditingWeek] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Utility: Get date range for a given week number of a year
  const getWeekDateRange = (weekNumber, year, weekStartStr, weekEndStr) => {
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (weekStartStr && weekEndStr) {
      const weekStart = new Date(`${weekStartStr}T00:00:00`);
      const weekEnd = new Date(`${weekEndStr}T00:00:00`);
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    }

    // Use Sunday-based week ranges (Sunday -> Saturday)
    const firstDay = new Date(year, 0, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysToSunday = (7 - dayOfWeek) % 7;
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() + daysToSunday);

    const weekStart = new Date(firstSunday);
    weekStart.setDate(firstSunday.getDate() + (weekNumber - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  // Get current week number
  const getCurrentWeekNumber = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysToSunday = (7 - dayOfWeek) % 7;
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() + daysToSunday);

    const diffDays = Math.floor((now - firstSunday) / (24 * 60 * 60 * 1000));
    return diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
  };

  // Color palette for weeks (cycling through colors)
  const weekColors = [
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-purple-50 border-purple-200',
    'bg-orange-50 border-orange-200',
    'bg-pink-50 border-pink-200',
    'bg-indigo-50 border-indigo-200',
    'bg-teal-50 border-teal-200',
    'bg-amber-50 border-amber-200'
  ];

  // Sample content for quick fill
  const sampleVerses = [
    {
      arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      transliteration: "Inna ma'al usri yusra",
      translation: 'Indeed, with hardship comes ease.',
      reference: 'Surah Ash-Sharh (94:6)'
    },
    {
      arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
      transliteration: "Wa man yatawakkal 'alallahi fahuwa hasbuh",
      translation: 'And whoever relies upon Allah - then He is sufficient for him.',
      reference: 'Surah At-Talaq (65:3)'
    },
    {
      arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
      transliteration: 'Fadhkuruni adhkurkum',
      translation: 'So remember Me; I will remember you.',
      reference: 'Surah Al-Baqarah (2:152)'
    },
    {
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
      transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan',
      translation: 'Our Lord, give us in this world good and in the Hereafter good.',
      reference: 'Surah Al-Baqarah (2:201)'
    }
  ];

  const sampleHadiths = [
    {
      arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
      transliteration: "Innamal a'malu bin niyyat",
      translation: 'Actions are judged by intentions.',
      reference: 'Sahih Bukhari'
    },
    {
      arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
      transliteration: "Khairukum man ta'allamal Qur'ana wa 'allamah",
      translation: 'The best of you are those who learn the Quran and teach it.',
      reference: 'Sahih Bukhari'
    },
    {
      arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
      transliteration: 'Tabassumuka fi wajhi akhika sadaqah',
      translation: 'Your smile to your brother is charity.',
      reference: 'Jami at-Tirmidhi'
    },
    {
      arabic: 'الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ',
      transliteration: "Al-mu'minul qawiyyu khayrun wa ahabbu ilallahi minal mu'minil da'if",
      translation: 'The strong believer is better and more beloved to Allah than the weak believer.',
      reference: 'Sahih Muslim'
    }
  ];

  // New content form state
  const [newContent, setNewContent] = useState({
    weekNumber: getCurrentWeekNumber(),
    year: selectedYear,
    verse: {
      arabic: '',
      transliteration: '',
      translation: '',
      reference: ''
    },
    hadith: {
      arabic: '',
      transliteration: '',
      translation: '',
      reference: ''
    },
    jummahPrayers: [
      {
        time: '13:30',
        khatib: '',
        location: 'Main Musallah'
      }
    ]
  });

  // Check if a week already has content
  const hasContentForWeek = (weekNumber, year) => {
    return weeklyContent.some(c => c.weekNumber === weekNumber && c.year === year);
  };

  // Get content for a specific week
  const getContentForWeek = (weekNumber, year) => {
    return weeklyContent.find(c => c.weekNumber === weekNumber && c.year === year);
  };

  // Get week color based on week number
  const getWeekColor = (weekNumber) => {
    return weekColors[weekNumber % weekColors.length];
  };

  // Copy text to clipboard
  const copyToClipboard = async (text, fieldId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
      showMessage('📋 Copied to clipboard');
    } catch (err) {
      showMessage('Failed to copy', true);
    }
  };

  // Load sample content
  const loadSample = (section) => {
    const samples = section === 'verse' ? sampleVerses : sampleHadiths;
    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    setNewContent({
      ...newContent,
      [section]: randomSample
    });
    showMessage(`✨ Sample ${section} loaded`);
  };

  // Add new content for a week
  const handleAddContent = () => {
    if (!newContent.verse.arabic && !newContent.hadith.arabic) {
      showMessage('At least one verse or hadith is required', true);
      return;
    }
    if (hasContentForWeek(newContent.weekNumber, newContent.year)) {
      showMessage('Content already exists for this week', true);
      return;
    }
    if (newContent.weekNumber < 1 || newContent.weekNumber > 52) {
      showMessage('Week number must be between 1 and 52', true);
      return;
    }

    const content = {
      id: Date.now(),
      ...newContent
    };

    onUpdate([...weeklyContent, content]);
    showMessage('✅ Weekly content added');
    
    // Find next available week
    let nextWeek = newContent.weekNumber + 1;
    while (nextWeek <= 52 && hasContentForWeek(nextWeek, selectedYear)) {
      nextWeek++;
    }
    if (nextWeek > 52) nextWeek = getCurrentWeekNumber();
    
    setNewContent({
      weekNumber: nextWeek,
      year: selectedYear,
      verse: {
        arabic: '',
        transliteration: '',
        translation: '',
        reference: ''
      },
      hadith: {
        arabic: '',
        transliteration: '',
        translation: '',
        reference: ''
      },
      jummahPrayers: [
        {
          time: '13:30',
          khatib: '',
          location: 'Main Musallah'
        }
      ]
    });
    setShowAddForm(false);
  };

  // Update content
  const handleUpdateContent = (updatedContent) => {
    onUpdate(weeklyContent.map(c => c.id === updatedContent.id ? updatedContent : c));
    showMessage('✅ Content updated');
    setEditingWeek(null);
  };

  // Delete content
  const handleDeleteContent = (contentId) => {
    if (confirm('Are you sure you want to delete this content?')) {
      onUpdate(weeklyContent.filter(c => c.id !== contentId));
      showMessage('🗑️ Content deleted');
    }
  };

  // Duplicate content for another week
  const handleDuplicateContent = (content) => {
    // Find next available week number
    let nextWeek = content.weekNumber + 1;
    while (nextWeek <= 52 && hasContentForWeek(nextWeek, content.year)) {
      nextWeek++;
    }
    
    if (nextWeek > 52) {
      showMessage('No available weeks in this year', true);
      return;
    }

    const newContent = {
      ...content,
      id: Date.now(),
      weekNumber: nextWeek
    };

    onUpdate([...weeklyContent, newContent]);
    showMessage(`✅ Content duplicated to ${availableWeeks[0].label}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Weekly Content</h3>
          <p className="text-sm text-gray-500">
            {weeklyContent.length} weeks configured • Verse and Hadith for each week of the year
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-md hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Add Week Content</span>
          </button>
        </div>
      </div>

      {/* Add Content Form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 animate-slideDown shadow-lg">
          <h4 className="font-semibold text-indigo-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Add Content for Week
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={newContent.weekNumber}
                  onChange={(e) => setNewContent({ ...newContent, weekNumber: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="1-52"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 text-sm">
                  {getWeekDateRange(newContent.weekNumber, selectedYear)}
                </div>
              </div>
            </div>

            {/* Verse Section */}
            <div className="border border-emerald-300 rounded-lg p-4 bg-emerald-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-emerald-900 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Verse of the Day
                </h5>
                <button
                  onClick={() => loadSample('verse')}
                  className="flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-800"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Load Sample</span>
                </button>
              </div>
              <ContentInputFields
                data={newContent.verse}
                onChange={(field, value) => setNewContent({
                  ...newContent,
                  verse: { ...newContent.verse, [field]: value }
                })}
                prefix="new-verse"
              />
            </div>

            {/* Hadith Section */}
            <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-amber-900 flex items-center">
                  <Book className="h-4 w-4 mr-2" />
                  Hadith of the Day
                </h5>
                <button
                  onClick={() => loadSample('hadith')}
                  className="flex items-center space-x-1 text-sm text-amber-600 hover:text-amber-800"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Load Sample</span>
                </button>
              </div>
              <ContentInputFields
                data={newContent.hadith}
                onChange={(field, value) => setNewContent({
                  ...newContent,
                  hadith: { ...newContent.hadith, [field]: value }
                })}
                prefix="new-hadith"
              />
            </div>

            {/* Jummah Prayer Section */}
            <div className="border border-green-300 rounded-lg p-4 bg-green-50">
              <h5 className="font-medium text-green-900 flex items-center mb-3">
                <Calendar className="h-4 w-4 mr-2" />
                Jummah Prayer Details (Friday)
              </h5>
              <div className="space-y-3">
                {newContent.jummahPrayers.map((prayer, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-white rounded-lg p-3 border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={prayer.time}
                        onChange={(e) => {
                          const updated = [...newContent.jummahPrayers];
                          updated[index] = { ...updated[index], time: e.target.value };
                          setNewContent({ ...newContent, jummahPrayers: updated });
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khatib</label>
                      <input
                        type="text"
                        value={prayer.khatib}
                        onChange={(e) => {
                          const updated = [...newContent.jummahPrayers];
                          updated[index] = { ...updated[index], khatib: e.target.value };
                          setNewContent({ ...newContent, jummahPrayers: updated });
                        }}
                        placeholder="Sheikh name"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={prayer.location}
                        onChange={(e) => {
                          const updated = [...newContent.jummahPrayers];
                          updated[index] = { ...updated[index], location: e.target.value };
                          setNewContent({ ...newContent, jummahPrayers: updated });
                        }}
                        placeholder="Main Musallah"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (newContent.jummahPrayers.length <= 1) return;
                          const updated = newContent.jummahPrayers.filter((_, i) => i !== index);
                          setNewContent({ ...newContent, jummahPrayers: updated });
                        }}
                        disabled={newContent.jummahPrayers.length <= 1}
                        className="text-gray-400 hover:text-red-500 p-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {newContent.jummahPrayers.length < 5 && (
                  <button
                    onClick={() => setNewContent({
                      ...newContent,
                      jummahPrayers: [...newContent.jummahPrayers, { time: '', khatib: '', location: '' }]
                    })}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Prayer Time</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewContent({
                  weekNumber: getCurrentWeekNumber(),
                  year: selectedYear,
                  verse: { arabic: '', transliteration: '', translation: '', reference: '' },
                  hadith: { arabic: '', transliteration: '', translation: '', reference: '' },
                  jummahPrayers: [{ time: '13:30', khatib: '', location: 'Main Musallah' }]
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddContent}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:shadow-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Content</span>
            </button>
          </div>
        </div>
      )}

      {/* Weekly Content List */}
      {weeklyContent.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No weekly content configured yet</p>
          <p className="text-sm">Add content for each week of the year</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeklyContent
            .filter(content => content.year === selectedYear)
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map(content => {
            const isExpanded = expandedWeek === content.id;
            const weekColor = getWeekColor(content.weekNumber);
            const isCurrentWeek = content.weekNumber === getCurrentWeekNumber() && content.year === new Date().getFullYear();

            return (
              <div 
                key={content.id}
                className={`border-2 rounded-xl overflow-hidden transition-all ${
                  isCurrentWeek ? 'ring-2 ring-indigo-400 border-indigo-300' : weekColor
                }`}
              >
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : content.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">Week {content.weekNumber}</span>
                        {isCurrentWeek && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {getWeekDateRange(content.weekNumber, content.year, content.weekStart, content.weekEnd)}, {content.year}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white border-t-2 animate-slideDown space-y-4">
                    {editingWeek === content.id ? (
                      <ContentEditForm
                        content={content}
                        onSave={handleUpdateContent}
                        onCancel={() => setEditingWeek(null)}
                        sampleVerses={sampleVerses}
                        sampleHadiths={sampleHadiths}
                        showMessage={showMessage}
                      />
                    ) : (
                      <>
                        {/* Verse Display */}
                        <div className="border border-emerald-300 rounded-lg p-4 bg-emerald-50">
                          <h5 className="font-medium text-emerald-900 mb-3 flex items-center">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Verse of the Day
                          </h5>
                          <ContentDisplay content={content.verse} type="verse" />
                        </div>

                        {/* Hadith Display */}
                        <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
                          <h5 className="font-medium text-amber-900 mb-3 flex items-center">
                            <Book className="h-4 w-4 mr-2" />
                            Hadith of the Day
                          </h5>
                          <ContentDisplay content={content.hadith} type="hadith" />
                        </div>

                        {/* Jummah Prayers Display */}
                        <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                          <h5 className="font-medium text-green-900 mb-3 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Jummah Prayer Details (Friday)
                          </h5>
                          {((content.jummahPrayers && content.jummahPrayers.length > 0)
                            || content.jummahPrayer) ? (
                            <div className="space-y-2">
                              {(content.jummahPrayers && content.jummahPrayers.length > 0
                                ? content.jummahPrayers
                                : [content.jummahPrayer]
                              ).map((prayer, index) => (
                                <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                                  <div className="font-medium text-gray-900">
                                    {prayer.time || prayer.prayerTime || 'TBD'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {prayer.khatib || 'Khatib TBA'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {prayer.location || 'Location TBA'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-sm">No Jummah prayers set</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            onClick={() => handleDuplicateContent(content)}
                            className="text-gray-600 hover:text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-all text-sm flex items-center space-x-1"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => setEditingWeek(content.id)}
                            className="text-gray-600 hover:text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-all text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteContent(content.id)}
                            className="text-gray-600 hover:text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-all text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Configure content for each week of the month (Week 1-5)</li>
          <li>• Use "Load Sample" to quickly add example content</li>
          <li>• Duplicate content from one week to another to save time</li>
          <li>• Arabic text will display right-to-left on the board</li>
          <li>• Always include proper references for authenticity</li>
        </ul>
      </div>
    </div>
  );
}

// Content input fields component
function ContentInputFields({ data, onChange, prefix }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Arabic Text</label>
        <textarea
          value={data.arabic}
          onChange={(e) => onChange('arabic', e.target.value)}
          dir="rtl"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-arabic text-right focus:ring-2 focus:ring-indigo-500"
          placeholder="أدخل النص العربي هنا..."
          style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Transliteration</label>
        <input
          type="text"
          value={data.transliteration}
          onChange={(e) => onChange('transliteration', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm italic focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter transliteration..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Translation</label>
        <textarea
          value={data.translation}
          onChange={(e) => onChange('translation', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter English translation..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
        <input
          type="text"
          value={data.reference}
          onChange={(e) => onChange('reference', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., Surah Al-Baqarah (2:255)"
        />
      </div>
    </div>
  );
}

// Content display component
function ContentDisplay({ content, type }) {
  if (!content.arabic && !content.translation) {
    return <p className="text-gray-400 italic text-sm">No content set</p>;
  }

  return (
    <div className="space-y-2">
      {content.arabic && (
        <p 
          className="text-lg leading-relaxed" 
          dir="rtl"
          style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
        >
          {content.arabic}
        </p>
      )}
      {content.transliteration && (
        <p className="text-gray-600 italic text-sm">{content.transliteration}</p>
      )}
      {content.translation && (
        <p className="text-gray-800">{content.translation}</p>
      )}
      {content.reference && (
        <p className="text-sm text-gray-500 font-medium">{content.reference}</p>
      )}
    </div>
  );
}

// Content edit form component
function ContentEditForm({ content, onSave, onCancel, sampleVerses, sampleHadiths, showMessage }) {
  const defaultJummahPrayer = { time: '13:30', khatib: '', location: 'Main Musallah' };
  const initialJummahPrayers = (content.jummahPrayers && content.jummahPrayers.length > 0)
    ? content.jummahPrayers
    : (content.jummahPrayer ? [content.jummahPrayer] : [defaultJummahPrayer]);
  const [formData, setFormData] = useState({
    ...content,
    jummahPrayers: initialJummahPrayers.map(prayer => ({
      ...defaultJummahPrayer,
      ...prayer
    }))
  });

  console.log('🔍 ContentEditForm formData:', formData);
  console.log('🔍 ContentEditForm formData.jummahPrayers:', formData.jummahPrayers);

  const loadSample = (section) => {
    const samples = section === 'verse' ? sampleVerses : sampleHadiths;
    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    setFormData({
      ...formData,
      [section]: randomSample
    });
    showMessage(`✨ Sample ${section} loaded`);
  };

  const handleSave = () => {
    console.log('🔍 handleSave called with formData:', formData);
    console.log('🔍 formData.jummahPrayers at save:', formData.jummahPrayers);
    onSave(formData);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Verse Section */}
      <div className="border border-emerald-300 rounded-lg p-4 bg-emerald-50">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-emerald-900 flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Verse of the Day
          </h5>
          <button
            onClick={() => loadSample('verse')}
            className="flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-800"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Sample</span>
          </button>
        </div>
        <ContentInputFields
          data={formData.verse}
          onChange={(field, value) => setFormData({
            ...formData,
            verse: { ...formData.verse, [field]: value }
          })}
          prefix="edit-verse"
        />
      </div>

      {/* Hadith Section */}
      <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-amber-900 flex items-center">
            <Book className="h-4 w-4 mr-2" />
            Hadith of the Day
          </h5>
          <button
            onClick={() => loadSample('hadith')}
            className="flex items-center space-x-1 text-sm text-amber-600 hover:text-amber-800"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Sample</span>
          </button>
        </div>
        <ContentInputFields
          data={formData.hadith}
          onChange={(field, value) => setFormData({
            ...formData,
            hadith: { ...formData.hadith, [field]: value }
          })}
          prefix="edit-hadith"
        />
      </div>

      {/* Jummah Prayer Section */}
      <div className="border border-green-300 rounded-lg p-4 bg-green-50">
        <h5 className="font-medium text-green-900 flex items-center mb-3">
          <Calendar className="h-4 w-4 mr-2" />
          Jummah Prayer Details (Friday)
        </h5>
        <div className="space-y-3">
          {formData.jummahPrayers.map((prayer, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-white rounded-lg p-3 border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={prayer.time}
                  onChange={(e) => {
                    const updated = [...formData.jummahPrayers];
                    updated[index] = { ...updated[index], time: e.target.value };
                    setFormData({ ...formData, jummahPrayers: updated });
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khatib</label>
                <input
                  type="text"
                  value={prayer.khatib}
                  onChange={(e) => {
                    const updated = [...formData.jummahPrayers];
                    updated[index] = { ...updated[index], khatib: e.target.value };
                    setFormData({ ...formData, jummahPrayers: updated });
                  }}
                  placeholder="Sheikh name"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={prayer.location}
                  onChange={(e) => {
                    const updated = [...formData.jummahPrayers];
                    updated[index] = { ...updated[index], location: e.target.value };
                    setFormData({ ...formData, jummahPrayers: updated });
                  }}
                  placeholder="Main Musallah"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (formData.jummahPrayers.length <= 1) return;
                    const updated = formData.jummahPrayers.filter((_, i) => i !== index);
                    setFormData({ ...formData, jummahPrayers: updated });
                  }}
                  disabled={formData.jummahPrayers.length <= 1}
                  className="text-gray-400 hover:text-red-500 p-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {formData.jummahPrayers.length < 5 && (
            <button
              onClick={() => setFormData({
                ...formData,
                jummahPrayers: [...formData.jummahPrayers, { time: '', khatib: '', location: '' }]
              })}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Prayer Time</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:shadow-lg"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default memo(WeeklyContentEditor);
