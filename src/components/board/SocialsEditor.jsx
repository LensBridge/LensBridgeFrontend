import { useMemo, useState } from 'react';
import {
  AtSign,
  ClipboardCheck,
  Edit2,
  ExternalLink,
  LayoutTemplate,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import BoardService from '../../services/BoardService';
import SocialIcon from './SocialIcon';
import SocialFramePreview from './SocialFramePreview';
import AudienceBadge from './AudienceBadge';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  DEFAULT_SOCIAL_DURATION_SECONDS,
  SOCIAL_PLATFORMS,
  socialPlatform,
  socialTypeLabel,
} from '../../models/board';
import useWizard from '../../hooks/useWizard';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  KeyValue,
  SearchInput,
  SegmentedControl,
  Select,
  StepIntro,
  WizardShell,
  useToast,
} from '../ui';

const emptySocial = () => ({
  name: '',
  type: 'instagram',
  url: '',
  handle: '',
  headerText: 'Follow us',
  heroText: '',
  footerText: '',
  duration: DEFAULT_SOCIAL_DURATION_SECONDS,
  audience: 'both',
});

function problems(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Give it a name.';
  if (!form.url.trim()) errors.url = 'A link is required — the QR code encodes it.';
  return errors;
}

const STEPS = [
  { id: 'account', label: 'Account', icon: AtSign, fields: ['name', 'url'] },
  { id: 'slide', label: 'Slide', icon: LayoutTemplate, fields: [] },
  { id: 'review', label: 'Review', icon: ClipboardCheck, fields: [] },
];

function Preview({ social }) {
  return (
    <div className="mt-5 pt-4 border-t border-hair">
      <p className="cap mb-2.5">Board preview</p>
      <SocialFramePreview social={social} />
      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        Roughly what a display renders. Exact type sizes depend on the screen, so treat this as a
        check on the words rather than on the pixels.
      </p>
    </div>
  );
}

/**
 * Accounts promoted onto the boards.
 *
 * The wizard carries a live preview of the frame the board will actually
 * render, because these entries are almost entirely presentation — four
 * free-text fields whose only purpose is how they look at three metres.
 * Editing them blind and checking the result on a wall is the workflow this
 * replaces.
 *
 * `handle` is nullable server-side and `''` here, and passing `''` is what
 * clears it. WhatsApp community invites have no handle at all, so the field
 * disappears for platforms whose metadata says `handled: false` — that is a
 * real state, not a field someone forgot.
 */
export default function SocialsEditor({ socials = [], onUpdate }) {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can(PERMISSIONS.BOARD_SOCIAL_WRITE);

  // Memoized because the fallback is a new array each render, which would
  // otherwise invalidate the filter memo below on every keystroke.
  const list = useMemo(() => (Array.isArray(socials) ? socials : []), [socials]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySocial());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const liveProblems = useMemo(() => problems(form), [form]);
  const wiz = useWizard(STEPS, liveProblems);

  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list
      .filter(
        (s) =>
          !needle ||
          s.name?.toLowerCase().includes(needle) ||
          s.handle?.toLowerCase().includes(needle)
      )
      .filter((s) => audience === 'all' || s.audience === audience);
  }, [list, query, audience]);

  const platform = socialPlatform(form.type);
  const creating = editing === 'new';

  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  const openNew = () => {
    setForm(emptySocial());
    setFormError(null);
    wiz.reset();
    setEditing('new');
  };

  const openEdit = (social) => {
    setForm({ ...social });
    setFormError(null);
    wiz.reset();
    setEditing(social);
  };

  const save = async () => {
    const found = problems(form);
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
        const created = await BoardService.createSocial(form);
        onUpdate([...list, created]);
        toast.success('Promoted account created.');
      } else {
        const updated = await BoardService.updateSocial(editing.id, form);
        onUpdate(list.map((s) => (s.id === editing.id ? updated : s)));
        toast.success('Promoted account updated.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await BoardService.deleteSocial(deleting.id);
    onUpdate(list.filter((s) => s.id !== deleting.id));
    toast.success('Promoted account removed.');
  };

  const reviewPrimary = {
    label: creating ? 'Promote account' : 'Save changes',
    icon: creating ? Plus : ClipboardCheck,
    busy: saving,
    busyLabel: creating ? 'Adding…' : 'Saving…',
    onClick: save,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search accounts"
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
            Promote an account
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={list.length === 0 ? 'Nothing promoted' : 'Nothing matches'}
          body={
            list.length === 0
              ? 'Each entry becomes a slide with a QR code, so people can follow from across the room.'
              : undefined
          }
          action={
            canWrite && list.length === 0 ? (
              <Button variant="primary" icon={Plus} onClick={openNew}>
                Promote an account
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((social, i) => (
            <li
              key={social.id}
              style={{ '--i': Math.min(i, 12) }}
              className="anim-stagger bg-surface border border-hair rounded-lg shadow-sm px-4 py-3.5 flex items-start gap-3"
            >
              <span className="shrink-0 w-8 h-8 rounded-md bg-raised border border-hair grid place-items-center text-soft">
                <SocialIcon type={social.type} className="w-4 h-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[13px] text-ink truncate">{social.name}</h4>
                  <AudienceBadge audience={social.audience} />
                </div>
                <p className="text-[12px] text-muted mt-0.5">
                  {socialTypeLabel(social.type)}
                  {social.handle ? ` · ${social.handle}` : ''}
                </p>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-faint hover:text-ember transition-colors break-all"
                >
                  {social.url}
                  <ExternalLink size={10} className="shrink-0" />
                </a>
                <p className="text-[11px] text-faint tabular mt-1">{social.duration}s on screen</p>
              </div>

              {canWrite && (
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit2}
                    aria-label="Edit"
                    onClick={() => openEdit(social)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    aria-label="Remove"
                    className="text-faint hover:text-bad"
                    onClick={() => setDeleting(social)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <WizardShell
        open={!!editing}
        title={creating ? 'Promote an account' : 'Edit account'}
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
          <div className="space-y-4">
            <StepIntro title="Account">
              Which account, and the link the QR code encodes. The name is for this list only.
            </StepIntro>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform" htmlFor="so-type">
                <Select
                  id="so-type"
                  value={form.type}
                  onChange={(e) => patch({ type: e.target.value })}
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Audience" htmlFor="so-audience">
                <Select
                  id="so-audience"
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
            </div>

            <Field
              label="Name"
              htmlFor="so-name"
              required
              error={wiz.showErr('name')}
              hint={wiz.showErr('name') ? undefined : 'For this list, not for the board.'}
            >
              <Input
                id="so-name"
                value={form.name}
                error={wiz.showErr('name')}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>

            <Field
              label="Link"
              htmlFor="so-url"
              required
              error={wiz.showErr('url')}
              hint={wiz.showErr('url') ? undefined : 'What the QR code encodes.'}
            >
              <Input
                id="so-url"
                type="url"
                placeholder={platform.urlHint}
                error={wiz.showErr('url')}
                value={form.url}
                onChange={(e) => patch({ url: e.target.value })}
              />
            </Field>

            {platform.handled && (
              <Field
                label="Handle"
                htmlFor="so-handle"
                hint="Shown under the name on the slide. Clear it to remove the line."
              >
                <Input
                  id="so-handle"
                  placeholder={platform.handleHint}
                  value={form.handle}
                  onChange={(e) => patch({ handle: e.target.value })}
                />
              </Field>
            )}
          </div>
        )}

        {wiz.index === 1 && (
          <div className="space-y-4">
            <StepIntro title="Slide">
              The words on the slide. Watch the preview — this is all presentation.
            </StepIntro>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Header" htmlFor="so-header">
                <Input
                  id="so-header"
                  value={form.headerText}
                  placeholder="Follow us"
                  onChange={(e) => patch({ headerText: e.target.value })}
                />
              </Field>
              <Field label="Seconds on screen" htmlFor="so-duration">
                <Input
                  id="so-duration"
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) => patch({ duration: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Hero line" htmlFor="so-hero" hint="The largest text on the slide.">
              <Input
                id="so-hero"
                value={form.heroText}
                onChange={(e) => patch({ heroText: e.target.value })}
              />
            </Field>

            <Field label="Footer" htmlFor="so-footer">
              <Input
                id="so-footer"
                value={form.footerText}
                placeholder="Scan to follow"
                onChange={(e) => patch({ footerText: e.target.value })}
              />
            </Field>

            <Preview social={form} />
          </div>
        )}

        {wiz.isLast && (
          <div>
            <StepIntro title="Review">
              Check it over, then {creating ? 'add it to the rotation' : 'save your changes'}.
            </StepIntro>

            <div className="grid gap-x-8 sm:grid-cols-2">
              <KeyValue label="Name" prose>
                {form.name || null}
              </KeyValue>
              <KeyValue label="Platform" prose>
                {socialTypeLabel(form.type)}
              </KeyValue>
              <KeyValue label="Audience" prose>
                {AUDIENCE_LABELS[form.audience] ?? form.audience}
              </KeyValue>
              <KeyValue label="Handle" prose>
                {form.handle || null}
              </KeyValue>
              <KeyValue label="On screen">{form.duration}s</KeyValue>
            </div>
            <a
              href={form.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-ember hover:underline underline-offset-4 break-all"
            >
              {form.url}
              <ExternalLink size={11} className="shrink-0" />
            </a>

            <Preview social={form} />
          </div>
        )}
      </WizardShell>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Stop promoting this account?"
        confirmLabel="Remove"
        body={
          <>
            <span className="text-ink">{deleting?.name}</span> drops out of the rotation on every
            board it was appearing on. The account itself is obviously unaffected.
          </>
        }
      />
    </div>
  );
}
