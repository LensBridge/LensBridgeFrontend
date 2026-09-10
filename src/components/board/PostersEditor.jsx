import { useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  ClipboardCheck,
  Edit2,
  FileText,
  Image as ImageIcon,
  Plus,
  QrCode,
  Trash2,
  Upload,
} from 'lucide-react';
import BoardService from '../../services/BoardService';
import AudienceBadge from './AudienceBadge';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from '../../models/board';
import useWizard from '../../hooks/useWizard';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  KeyValue,
  Modal,
  SearchInput,
  SegmentedControl,
  Select,
  StepIntro,
  WizardShell,
  useToast,
} from '../ui';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const emptyPoster = () => ({
  title: '',
  duration: 10_000,
  startDate: today(),
  endDate: inDays(30),
  audience: 'both',
  // Optional. When set, the board pairs the poster with a QR code encoding the
  // link instead of showing it full-bleed.
  signupUrl: '',
});

/**
 * A QR encoding a malformed URL still renders — it just fails when scanned, on
 * a wall, where nobody is watching it fail. Cheaper to catch here.
 * @returns {string} error message, or '' when the link is fine or empty
 */
function signupUrlProblem(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
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

function isLive(poster) {
  const now = today();
  return (!poster.startDate || poster.startDate <= now) && (!poster.endDate || poster.endDate >= now);
}

/**
 * Everything the server would reject, keyed by the box it belongs under.
 * `image` is the dropzone; `schedule` hangs the date-order message on the step.
 */
function problems(form, { needsImage }) {
  const errors = {};
  if (needsImage) errors.image = 'Pick an image to upload.';
  if (!form.title.trim()) errors.title = 'Give the poster a title.';
  const urlErr = signupUrlProblem(form.signupUrl);
  if (urlErr) errors.signupUrl = urlErr;
  if (form.endDate < form.startDate) errors.schedule = 'It cannot come down before it goes up.';
  return errors;
}

const STEPS = [
  { id: 'artwork', label: 'Artwork', icon: ImageIcon, fields: ['image'] },
  { id: 'details', label: 'Details', icon: FileText, fields: ['title', 'signupUrl'] },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock, fields: ['schedule'] },
  { id: 'review', label: 'Review', icon: ClipboardCheck, fields: [] },
];

/**
 * Poster artwork and its scheduling window.
 *
 * A grid rather than a list: posters are pictures, and a row of titles tells
 * you nothing about whether the one you are about to replace is the right one.
 *
 * The image is write-once at creation. Replacing it afterwards goes through a
 * separate endpoint (`PUT .../image`) under the same permission, which is why
 * the edit wizard offers a replace control rather than treating the file as
 * just another field.
 */
export default function PostersEditor({ posters = [], onUpdate }) {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can(PERMISSIONS.BOARD_POSTER_WRITE);

  // Memoized because the fallback is a new array each render, which would
  // otherwise invalidate the filter memo below on every keystroke.
  const list = useMemo(() => (Array.isArray(posters) ? posters : []), [posters]);

  const [editing, setEditing] = useState(null); // poster object, or 'new'
  const [form, setForm] = useState(emptyPoster());
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const fileInput = useRef(null);

  const creating = editing === 'new';
  const needsImage = creating && !file;

  const liveProblems = useMemo(
    () => problems(form, { needsImage }),
    [form, needsImage]
  );
  const wiz = useWizard(STEPS, liveProblems);

  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list
      .filter((p) => !needle || p.title?.toLowerCase().includes(needle))
      .filter((p) => audience === 'all' || p.audience === audience);
  }, [list, query, audience]);

  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  const takeFile = (candidate) => {
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setFormError('That is not an image.');
      return;
    }
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
    setFormError(null);
  };

  const openNew = () => {
    setForm(emptyPoster());
    setFile(null);
    setPreview(null);
    setFormError(null);
    wiz.reset();
    setEditing('new');
  };

  const openEdit = (poster) => {
    setForm({ ...poster });
    setFile(null);
    setPreview(null);
    setFormError(null);
    wiz.reset();
    setEditing(poster);
  };

  const save = async () => {
    const found = problems(form, { needsImage });
    if (Object.keys(found).length > 0) {
      const bad = STEPS.findIndex((s) => s.fields.some((field) => found[field]));
      wiz.revealThrough(bad === -1 ? wiz.last : bad);
      if (bad !== -1) wiz.setIndex(bad);
      setFormError('Fix the flagged fields — the step is open below.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (creating) {
        const created = await BoardService.createPoster({ ...form, imageFile: file });
        onUpdate([...list, created]);
        toast.success('Poster created.');
      } else {
        let updated = await BoardService.updatePoster(editing.id, form);
        // The image lives behind its own endpoint and its own request; only send
        // it when someone actually chose a replacement.
        if (file) updated = await BoardService.updatePosterImage(editing.id, file);
        onUpdate(list.map((p) => (p.id === editing.id ? updated : p)));
        toast.success('Poster updated.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await BoardService.deletePoster(deleting.id);
    onUpdate(list.filter((p) => p.id !== deleting.id));
    toast.success('Poster deleted.');
  };

  const seconds = Math.round((form.duration || 0) / 1000);
  const reviewPrimary = {
    label: creating ? 'Create poster' : 'Save changes',
    icon: creating ? Plus : ClipboardCheck,
    busy: saving,
    busyLabel: creating ? 'Creating…' : 'Saving…',
    onClick: save,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search posters"
          className="w-full sm:w-64"
        />
        <SegmentedControl
          size="sm"
          value={audience}
          onChange={setAudience}
          options={[{ value: 'all', label: 'All' }, ...AUDIENCE_OPTIONS]}
        />
        {canWrite && (
          <Button variant="primary" icon={Plus} onClick={openNew} className="ml-auto">
            New poster
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={list.length === 0 ? 'No posters yet' : 'Nothing matches'}
          body={
            list.length === 0
              ? 'Posters are the full-screen artwork in the rotation. Each one carries its own window and audience.'
              : undefined
          }
          action={
            canWrite && list.length === 0 ? (
              <Button variant="primary" icon={Plus} onClick={openNew}>
                New poster
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((poster, i) => {
            const live = isLive(poster);
            return (
              <article
                key={poster.id}
                style={{ '--i': Math.min(i, 12) }}
                className={`anim-stagger bg-surface border rounded-lg shadow-sm overflow-hidden flex flex-col ${
                  live ? 'border-hair' : 'border-hair opacity-70'
                }`}
              >
                <button
                  onClick={() => setLightbox(poster)}
                  className="relative block aspect-[3/4] bg-raised overflow-hidden group"
                >
                  {poster.imageUrl ? (
                    <img
                      src={poster.imageUrl}
                      alt={poster.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-faint">
                      <ImageIcon size={26} strokeWidth={1.3} />
                    </span>
                  )}
                  <span className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    <AudienceBadge audience={poster.audience} />
                    {!live && (
                      <Badge tone="quiet" size="sm">
                        Not showing
                      </Badge>
                    )}
                    {poster.signupUrl && (
                      <Badge tone="ember" size="sm" icon={QrCode}>
                        QR
                      </Badge>
                    )}
                  </span>
                </button>

                <div className="p-3.5 flex-1 flex flex-col">
                  <h4 className="text-[13px] text-ink leading-snug line-clamp-2">
                    {poster.title}
                  </h4>
                  <p className="mt-1.5 text-[11px] text-muted tabular">
                    {poster.startDate} → {poster.endDate}
                  </p>
                  <p className="text-[11px] text-faint tabular">
                    {Math.round((poster.duration || 0) / 1000)}s on screen
                  </p>

                  {canWrite && (
                    <div className="mt-3 pt-2.5 border-t border-hair flex items-center gap-1">
                      <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(poster)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label="Delete"
                        className="ml-auto text-faint hover:text-bad"
                        onClick={() => setDeleting(poster)}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <WizardShell
        open={!!editing}
        title={creating ? 'New poster' : 'Edit poster'}
        steps={STEPS}
        step={editing ? wiz.index : 0}
        onStepChange={wiz.go}
        onClose={() => setEditing(null)}
        dismissable={!saving}
        canContinue={wiz.canContinue}
        onBlocked={() => wiz.reveal(wiz.index)}
        primary={wiz.isLast ? reviewPrimary : undefined}
        error={wiz.stepError}
      >
        {formError && (
          <p className="mb-5 text-[13px] text-bad bg-bad-dim/50 border border-bad/30 rounded-md px-3.5 py-2.5">
            {formError}
          </p>
        )}

        {wiz.index === 0 && (
          <div className="space-y-3">
            <StepIntro title="Artwork">
              {creating
                ? 'The full-screen image. It is set once here — replacing it later is a separate step.'
                : 'Drop a new file to replace the artwork, or leave it and move on.'}
            </StepIntro>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                takeFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInput.current?.click()}
              className={`cursor-pointer rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
                dragOver
                  ? 'border-ember bg-ember-haze'
                  : wiz.showErr('image')
                    ? 'border-bad'
                    : 'border-line hover:border-line-loud'
              }`}
            >
              {preview || editing?.imageUrl ? (
                <img
                  src={preview || editing.imageUrl}
                  alt=""
                  className="max-h-52 mx-auto rounded-md object-contain"
                />
              ) : (
                <Upload size={22} className="mx-auto text-faint mb-2" strokeWidth={1.5} />
              )}
              <p className="text-[12px] text-muted mt-3">
                {file
                  ? file.name
                  : creating
                    ? 'Drop an image here, or click to choose one'
                    : 'Click to replace the artwork'}
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => takeFile(e.target.files?.[0])}
              />
            </div>
            {wiz.showErr('image') && (
              <p className="text-[12px] text-bad">{wiz.showErr('image')}</p>
            )}
          </div>
        )}

        {wiz.index === 1 && (
          <div className="space-y-4">
            <StepIntro title="Details">
              The title is for this list, not the screen. A sign-up link turns the slide into a
              poster-plus-QR instead of full-bleed artwork.
            </StepIntro>

            <Field label="Title" htmlFor="po-title" required error={wiz.showErr('title')}>
              <Input
                id="po-title"
                autoFocus
                value={form.title}
                error={wiz.showErr('title')}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <Field label="Audience" htmlFor="po-audience">
              <Select
                id="po-audience"
                value={form.audience}
                onChange={(e) => patch({ audience: e.target.value })}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Sign-up link"
              htmlFor="po-signup"
              error={wiz.showErr('signupUrl')}
              hint={
                wiz.showErr('signupUrl')
                  ? undefined
                  : 'Optional. With a link set, the board shows the poster beside a QR code instead of full-bleed.'
              }
            >
              <Input
                id="po-signup"
                type="url"
                placeholder="https://"
                error={wiz.showErr('signupUrl')}
                value={form.signupUrl}
                onChange={(e) => patch({ signupUrl: e.target.value })}
              />
            </Field>
          </div>
        )}

        {wiz.index === 2 && (
          <div className="space-y-4">
            <StepIntro title="Schedule">
              The window the poster is in the rotation, and how long it holds the screen each pass.
            </StepIntro>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Goes up" htmlFor="po-start">
                <Input
                  id="po-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                />
              </Field>
              <Field label="Comes down" htmlFor="po-end" error={wiz.showErr('schedule')}>
                <Input
                  id="po-end"
                  type="date"
                  error={wiz.showErr('schedule')}
                  value={form.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                />
              </Field>
              <Field label="Seconds on screen" htmlFor="po-duration">
                <Input
                  id="po-duration"
                  type="number"
                  min="1"
                  value={seconds}
                  onChange={(e) => patch({ duration: Number(e.target.value) * 1000 })}
                />
              </Field>
            </div>
          </div>
        )}

        {wiz.isLast && (
          <div>
            <StepIntro title="Review">
              Check it over, then {creating ? 'create it' : 'save your changes'}.
            </StepIntro>

            <div className="flex gap-5">
              {(preview || editing?.imageUrl) && (
                <img
                  src={preview || editing.imageUrl}
                  alt=""
                  className="w-28 shrink-0 rounded-md object-cover bg-raised"
                />
              )}
              <div className="min-w-0 flex-1 grid gap-x-8 sm:grid-cols-2">
                <KeyValue label="Title" prose>
                  {form.title || null}
                </KeyValue>
                <KeyValue label="Audience" prose>
                  {AUDIENCE_LABELS[form.audience] ?? form.audience}
                </KeyValue>
                <KeyValue label="Window">
                  {form.startDate} → {form.endDate}
                </KeyValue>
                <KeyValue label="On screen">{seconds}s</KeyValue>
                <KeyValue label="Sign-up" prose>
                  {form.signupUrl ? 'QR code' : null}
                </KeyValue>
              </div>
            </div>
          </div>
        )}
      </WizardShell>

      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        size="lg"
        caption={lightbox ? `${lightbox.startDate} → ${lightbox.endDate}` : ''}
        title={lightbox?.title}
      >
        {lightbox?.imageUrl && (
          <img
            src={lightbox.imageUrl}
            alt={lightbox.title}
            className="w-full max-h-[68vh] object-contain rounded-md bg-raised"
          />
        )}
        {lightbox?.signupUrl && (
          <p className="mt-4 text-[12px] text-muted break-all">
            QR encodes{' '}
            <a
              href={lightbox.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ember hover:underline underline-offset-4"
            >
              {lightbox.signupUrl}
            </a>
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this poster?"
        confirmLabel="Delete"
        body={
          <>
            <span className="text-ink">{deleting?.title}</span> and its artwork are removed. If
            you only want it off the screens for now, set the end date to yesterday instead.
          </>
        }
      />
    </div>
  );
}
