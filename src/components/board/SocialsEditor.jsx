import { useState, memo } from 'react';
import {
  Plus, Trash2, Edit2, Eye, X, Search, Loader2, Clock, Share2, AtSign, Link2
} from 'lucide-react';
import BoardService from '../../services/BoardService';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import {
  SOCIAL_PLATFORMS,
  socialPlatform,
  socialTypeLabel,
  DEFAULT_SOCIAL_DURATION_SECONDS,
  SLIDE_DURATION_MIN_SECONDS,
  SLIDE_DURATION_MAX_SECONDS
} from '../../models/board';
import { stripInlineMarkdown } from '../../utils/inlineMarkdown';
import SocialIcon from './SocialIcon';
import SocialFramePreview from './SocialFramePreview';

/**
 * SocialsEditor — the accounts promoted to the boards.
 *
 * Replaces the single hardcoded Instagram slide the kiosk used to carry. Each
 * entry is one frame: its own copy, its own QR destination, its own audience and
 * dwell time.
 *
 * `board:content:read` gets the list and the preview; every write needs
 * `board:social:write` on top, exactly as PostersEditor gates on
 * `board:poster:write`.
 *
 * `name` is an admin-facing label and never reaches a board — the four Markdown
 * fields are what an operator is actually publishing, which is why the form
 * carries a live preview beside them rather than a Save button and a walk to the
 * musallah.
 */

const audienceOptions = [
  { value: 'both', label: 'Everyone', color: 'bg-purple-100 text-purple-700' },
  { value: 'brothers', label: 'Brothers', color: 'bg-blue-100 text-blue-700' },
  { value: 'sisters', label: 'Sisters', color: 'bg-pink-100 text-pink-700' }
];

const EMPTY_FORM = {
  name: '',
  type: 'instagram',
  url: '',
  duration: DEFAULT_SOCIAL_DURATION_SECONDS,
  audience: 'both',
  headerText: '',
  heroText: '',
  handle: '',
  footerText: ''
};

const INPUT_CLASS =
  'w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white';

/** Says what the four Markdown fields accept, in the fields themselves. */
function MarkdownHint() {
  return (
    <p className="mt-1 text-xs text-gray-500">
      Inline Markdown: <code className="rounded bg-gray-100 px-1">*italic*</code> and{' '}
      <code className="rounded bg-gray-100 px-1">**bold**</code>.
    </p>
  );
}

/**
 * A QR encoding a malformed URL still renders — it just fails when scanned, on a
 * wall, where nobody is watching. Same check PostersEditor runs on signup links.
 * @returns {string} error message, or '' when the link is fine
 */
function validateUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'A QR destination is required.';
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Enter a complete URL, including https://';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http:// and https:// links can be opened by a phone camera.';
  }
  return '';
}

function durationError(value) {
  if (!Number.isInteger(value)) return 'Enter a whole number of seconds.';
  if (value < SLIDE_DURATION_MIN_SECONDS || value > SLIDE_DURATION_MAX_SECONDS) {
    return `Must be between ${SLIDE_DURATION_MIN_SECONDS} and ${SLIDE_DURATION_MAX_SECONDS} seconds.`;
  }
  return '';
}

function SocialsEditor({ socials = [], onUpdate, showMessage }) {
  const { can } = useAuth();
  const canWrite = can(PERMISSIONS.BOARD_SOCIAL_WRITE);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const safeSocials = Array.isArray(socials) ? socials : [];
  const platform = socialPlatform(formData.type);

  const urlError = validateUrl(formData.url);
  const secondsError = durationError(formData.duration);

  const resetForm = () => setFormData(EMPTY_FORM);

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  const needle = searchTerm.trim().toLowerCase();
  const filtered = safeSocials
    .filter(s =>
      !needle ||
      s.name?.toLowerCase().includes(needle) ||
      s.handle?.toLowerCase().includes(needle) ||
      s.url?.toLowerCase().includes(needle) ||
      socialTypeLabel(s.type).toLowerCase().includes(needle)
    )
    .filter(s => filterAudience === 'all' || s.audience === filterAudience);

  // Which platforms are on the boards right now, for the summary strip.
  const promotedPlatforms = SOCIAL_PLATFORMS
    .map(p => ({ ...p, count: safeSocials.filter(s => s.type === p.value).length }))
    .filter(p => p.count > 0);

  const handleSave = async (isNew) => {
    if (!canWrite) return;
    if (!formData.name.trim()) {
      showMessage('Name is required', 'error');
      return;
    }
    if (!formData.heroText.trim()) {
      showMessage('Hero text is required — it is the frame’s headline', 'error');
      return;
    }
    if (urlError) {
      showMessage(urlError, 'error');
      return;
    }
    if (secondsError) {
      showMessage(secondsError, 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await BoardService.createSocial(formData);
        onUpdate([...safeSocials, created].sort((a, b) => a.name.localeCompare(b.name)));
        showMessage('Social promoted!');
      } else {
        // Every field is sent, including `handle`. That is deliberate: the API
        // treats an omitted handle as "leave it alone" and an empty string as
        // "clear it", so an operator who deletes the handle has to produce ''.
        const updated = await BoardService.updateSocial(editingId, formData);
        onUpdate(
          safeSocials
            .map(s => (s.id === editingId ? updated : s))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        showMessage('Social updated!');
      }
      closeForm();
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (social) => {
    if (!canWrite) return;
    if (!confirm(`Stop promoting "${social.name}"?`)) return;
    try {
      await BoardService.deleteSocial(social.id);
      onUpdate(safeSocials.filter(s => s.id !== social.id));
      showMessage('Social removed');
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    }
  };

  const startEdit = (social) => {
    setFormData({
      name: social.name || '',
      type: social.type || 'other',
      url: social.url || '',
      duration: social.duration || DEFAULT_SOCIAL_DURATION_SECONDS,
      audience: social.audience || 'both',
      headerText: social.headerText || '',
      heroText: social.heroText || '',
      handle: social.handle || '',
      footerText: social.footerText || ''
    });
    setEditingId(social.id);
    setShowAddForm(false);
  };

  const getAudienceBadge = (audience) => {
    const opt = audienceOptions.find(o => o.value === audience) || audienceOptions[0];
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.label}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search socials..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setEditingId(null); resetForm(); }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Social
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterAudience('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            filterAudience === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({safeSocials.length})
        </button>
        {audienceOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilterAudience(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              filterAudience === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label} ({safeSocials.filter(s => s.audience === opt.value).length})
          </button>
        ))}
      </div>

      {/* Which platforms are live, at a glance. Icons carry their own label. */}
      {promotedPlatforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="text-xs uppercase tracking-wide text-gray-400">On the boards</span>
          {promotedPlatforms.map(p => (
            <span
              key={p.value}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700"
            >
              <SocialIcon type={p.value} className="h-3.5 w-3.5" />
              {p.label}
              <span className="text-gray-400">{p.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Add/Edit form, with the frame it produces beside it */}
      {(showAddForm || editingId) && (
        <div className={`rounded-xl border-2 p-5 ${showAddForm ? 'border-indigo-200 bg-indigo-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">{showAddForm ? 'New Social' : 'Edit Social'}</h4>
            <button type="button" onClick={closeForm} className="rounded p-1 hover:bg-gray-200">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="social-name" className="mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  id="social-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g., MSA Instagram"
                />
                <p className="mt-1 text-xs text-gray-500">
                  For this list only. Never shown on a board.
                </p>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">Platform</span>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORMS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={formData.type === opt.value}
                      onClick={() => setFormData({ ...formData, type: opt.value })}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        formData.type === opt.value
                          ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <SocialIcon type={opt.value} className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="social-url" className="mb-1 block text-sm font-medium text-gray-700">
                  QR destination *
                </label>
                <input
                  id="social-url"
                  type="url"
                  inputMode="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder={platform.urlHint}
                  className={`${INPUT_CLASS} ${urlError && formData.url ? 'border-red-300' : ''}`}
                />
                {urlError && formData.url ? (
                  <p className="mt-1 text-xs text-red-600">{urlError}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Where the on-screen QR code sends a phone.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="social-duration" className="mb-1 block text-sm font-medium text-gray-700">
                    Duration (seconds)
                  </label>
                  <input
                    id="social-duration"
                    type="number"
                    min={SLIDE_DURATION_MIN_SECONDS}
                    max={SLIDE_DURATION_MAX_SECONDS}
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) })}
                    className={`${INPUT_CLASS} ${secondsError ? 'border-red-300' : ''}`}
                  />
                  {secondsError && <p className="mt-1 text-xs text-red-600">{secondsError}</p>}
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-gray-700">Audience</span>
                  <div className="flex gap-2">
                    {audienceOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={formData.audience === opt.value}
                        onClick={() => setFormData({ ...formData, audience: opt.value })}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                          formData.audience === opt.value
                            ? `${opt.color} border-current`
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  On-screen copy
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="social-header" className="mb-1 block text-sm font-medium text-gray-700">
                      Header text
                    </label>
                    <input
                      id="social-header"
                      type="text"
                      value={formData.headerText}
                      onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder="follow along"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Two or three words. The board uppercases it.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="social-hero" className="mb-1 block text-sm font-medium text-gray-700">
                      Hero text *
                    </label>
                    <textarea
                      id="social-hero"
                      rows={2}
                      value={formData.heroText}
                      onChange={(e) => setFormData({ ...formData, heroText: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder="Catch the community on *Instagram*."
                    />
                    <MarkdownHint />
                  </div>

                  <div>
                    <label htmlFor="social-handle" className="mb-1 block text-sm font-medium text-gray-700">
                      Handle <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="social-handle"
                      type="text"
                      value={formData.handle}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder={platform.handleHint}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {platform.handled
                        ? 'Leave empty and the board omits the handle line entirely.'
                        : `${platform.label} has no public handle — leave this empty.`}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="social-footer" className="mb-1 block text-sm font-medium text-gray-700">
                      Footer text
                    </label>
                    <textarea
                      id="social-footer"
                      rows={3}
                      value={formData.footerText}
                      onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder="Follow *your home on campus* for event recaps, announcements, and more!"
                    />
                    <MarkdownHint />
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:sticky xl:top-24 xl:self-start">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Board preview
              </p>
              <SocialFramePreview social={formData} />
              <p className="mt-2 text-xs text-gray-500">
                Updates as you type. Approximate scale; the real frame is 1920&times;1080.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(showAddForm)}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                : showAddForm ? 'Promote Social' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center">
          <Share2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="font-medium text-gray-500">
            {safeSocials.length === 0 ? 'No socials promoted yet' : 'No socials match that filter'}
          </p>
          {safeSocials.length === 0 && (
            <p className="mt-1 text-sm text-gray-400">
              Boards show one frame per promoted account.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(social => (
            <div
              key={social.id}
              className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-gray-100 p-2 text-gray-600">
                  <SocialIcon type={social.type} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-medium text-gray-900">{social.name}</h4>
                    {/* The icon above is decorative; this is the platform's label. */}
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {socialTypeLabel(social.type)}
                    </span>
                    {getAudienceBadge(social.audience)}
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {stripInlineMarkdown(social.heroText) || 'No headline set'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {social.duration}s
                    </span>
                    {social.handle && (
                      <span className="flex items-center gap-1">
                        <AtSign className="h-3 w-3" aria-hidden="true" />
                        {stripInlineMarkdown(social.handle).replace(/^@/, '')}
                      </span>
                    )}
                    <span className="flex min-w-0 items-center gap-1">
                      <Link2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate" title={social.url}>{social.url}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewing(social)}
                  aria-label={`Preview the ${social.name} frame`}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <Eye className="h-5 w-5 text-gray-600" />
                </button>
                {canWrite && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(social)}
                      aria-label={`Edit ${social.name}`}
                      className="rounded-lg p-2 hover:bg-gray-100"
                    >
                      <Edit2 className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(social)}
                      aria-label={`Stop promoting ${social.name}`}
                      className="rounded-lg p-2 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-size preview */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewing(null)}
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <SocialFramePreview social={previewing} />
          </div>
          <button
            type="button"
            onClick={() => setPreviewing(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 rounded-full bg-white p-2 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SocialsEditor);
