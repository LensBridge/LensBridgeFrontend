import { useState, memo } from 'react';
import { 
  BookOpen, Book, Quote, RefreshCw, Copy, Check,
  ChevronDown, ChevronUp, Eye, Sparkles
} from 'lucide-react';

/**
 * DailyContentEditor - Edit verse and hadith of the day
 * Manages Arabic text, transliteration, translation, and references
 */
function DailyContentEditor({ content, onUpdate, showMessage }) {
  const [expandedSection, setExpandedSection] = useState('verse');
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Update a specific field in content
  const updateField = (section, field, value) => {
    onUpdate({
      ...content,
      [section]: {
        ...content[section],
        [field]: value
      }
    });
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

  // Sample content for quick fill (for demo purposes)
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
    }
  ];

  // Load sample content
  const loadSample = (section, samples) => {
    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    onUpdate({
      ...content,
      [section]: randomSample
    });
    showMessage(`✨ Sample ${section} loaded`);
  };

  // Quote input section component
  const QuoteSection = ({ 
    sectionId, 
    title, 
    icon: Icon, 
    data, 
    samples,
    colorClass 
  }) => {
    const isExpanded = expandedSection === sectionId;

    return (
      <div className={`border rounded-lg overflow-hidden ${isExpanded ? 'border-indigo-300' : 'border-gray-200'}`}>
        {/* Section Header */}
        <button
          onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
          className={`w-full flex items-center justify-between p-4 transition-colors ${
            isExpanded ? colorClass : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Icon className={`h-5 w-5 ${isExpanded ? 'text-white' : 'text-gray-600'}`} />
            <span className={`font-medium ${isExpanded ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {data.arabic && (
              <span className={`text-sm ${isExpanded ? 'text-white/80' : 'text-gray-500'}`}>
                {data.reference || 'No reference'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className={`h-5 w-5 ${isExpanded ? 'text-white' : 'text-gray-400'}`} />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div className="p-4 bg-white space-y-4">
            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fill in the details below</span>
              <button
                onClick={() => loadSample(sectionId, samples)}
                className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load Sample</span>
              </button>
            </div>

            {/* Arabic Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Arabic Text
                </label>
                <button
                  onClick={() => copyToClipboard(data.arabic, `${sectionId}-arabic`)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy"
                >
                  {copiedField === `${sectionId}-arabic` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <textarea
                value={data.arabic}
                onChange={(e) => updateField(sectionId, 'arabic', e.target.value)}
                dir="rtl"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xl font-arabic text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="أدخل النص العربي هنا..."
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              />
            </div>

            {/* Transliteration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Transliteration
                </label>
                <button
                  onClick={() => copyToClipboard(data.transliteration, `${sectionId}-translit`)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy"
                >
                  {copiedField === `${sectionId}-translit` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <input
                type="text"
                value={data.transliteration}
                onChange={(e) => updateField(sectionId, 'transliteration', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 italic focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter transliteration..."
              />
            </div>

            {/* Translation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  English Translation
                </label>
                <button
                  onClick={() => copyToClipboard(data.translation, `${sectionId}-translation`)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy"
                >
                  {copiedField === `${sectionId}-translation` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <textarea
                value={data.translation}
                onChange={(e) => updateField(sectionId, 'translation', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter English translation..."
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference / Source
              </label>
              <input
                type="text"
                value={data.reference}
                onChange={(e) => updateField(sectionId, 'reference', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Surah Al-Baqarah (2:255) or Sahih Bukhari"
              />
            </div>

            {/* Character Counts */}
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>Arabic: {data.arabic.length} chars</span>
              <span>Transliteration: {data.transliteration.length} chars</span>
              <span>Translation: {data.translation.length} chars</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Daily Content</h3>
          <p className="text-sm text-gray-500">Verse and Hadith of the day displayed on the board</p>
        </div>
        
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            previewMode 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Eye className="h-4 w-4" />
          <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
        </button>
      </div>

      {/* Preview Mode */}
      {previewMode ? (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-white">
          <div className="max-w-2xl mx-auto space-y-12">
            {/* Verse Preview */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-6">
                <BookOpen className="h-6 w-6 text-emerald-400" />
                <span className="text-emerald-400 font-medium uppercase tracking-wider text-sm">
                  Verse of the Day
                </span>
              </div>
              <p 
                className="text-3xl mb-4 leading-relaxed" 
                dir="rtl"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              >
                {content.verse.arabic || 'No Arabic text set'}
              </p>
              <p className="text-gray-400 italic mb-2">
                {content.verse.transliteration || 'No transliteration set'}
              </p>
              <p className="text-xl text-gray-200 mb-4">
                "{content.verse.translation || 'No translation set'}"
              </p>
              <p className="text-emerald-400 text-sm">
                {content.verse.reference || 'No reference set'}
              </p>
            </div>

            <div className="border-t border-gray-700" />

            {/* Hadith Preview */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-6">
                <Book className="h-6 w-6 text-amber-400" />
                <span className="text-amber-400 font-medium uppercase tracking-wider text-sm">
                  Hadith of the Day
                </span>
              </div>
              <p 
                className="text-3xl mb-4 leading-relaxed" 
                dir="rtl"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              >
                {content.hadith.arabic || 'No Arabic text set'}
              </p>
              <p className="text-gray-400 italic mb-2">
                {content.hadith.transliteration || 'No transliteration set'}
              </p>
              <p className="text-xl text-gray-200 mb-4">
                "{content.hadith.translation || 'No translation set'}"
              </p>
              <p className="text-amber-400 text-sm">
                {content.hadith.reference || 'No reference set'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Verse Section */}
          <QuoteSection
            sectionId="verse"
            title="Verse of the Day"
            icon={BookOpen}
            data={content.verse}
            samples={sampleVerses}
            colorClass="bg-gradient-to-r from-emerald-600 to-teal-600"
          />

          {/* Hadith Section */}
          <QuoteSection
            sectionId="hadith"
            title="Hadith of the Day"
            icon={Book}
            data={content.hadith}
            samples={sampleHadiths}
            colorClass="bg-gradient-to-r from-amber-600 to-orange-600"
          />
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use the "Load Sample" button to quickly add example content</li>
          <li>• Arabic text will display right-to-left on the board</li>
          <li>• Keep translations concise for better readability</li>
          <li>• Always include proper references for authenticity</li>
          <li>• Preview your content to see how it will appear on the board</li>
        </ul>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="text-sm text-emerald-700">Verse</div>
              <div className="font-medium text-emerald-900">
                {content.verse.reference || 'Not set'}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Book className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-sm text-amber-700">Hadith</div>
              <div className="font-medium text-amber-900">
                {content.hadith.reference || 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DailyContentEditor);
