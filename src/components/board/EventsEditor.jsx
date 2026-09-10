import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Clock,
  ClipboardCheck,
  Edit2,
  FileText,
  ImagePlus,
  Link2Off,
  MapPin,
  Plus,
  Ticket,
  Trash2,
} from 'lucide-react';
import BoardService from '../../services/BoardService';
import TicketEventPicker from './TicketEventPicker';
import AudienceBadge from './AudienceBadge';
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from '../../models/board';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import useWizard from '../../hooks/useWizard';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  KeyValue,
  SearchInput,
  SegmentedControl,
  Select,
  StepIntro,
  Textarea,
  WizardShell,
  useToast,
} from '../ui';

/** `<input type="datetime-local">` wants local wall-clock, not an ISO instant. */
const toLocalInput = (epochMs) => {
  const d = new Date(epochMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtWhen = (epochMs) =>
  new Date(epochMs).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const emptyEvent = () => ({
  name: '',
  startEpochMs: Date.now() + 86_400_000,
  endEpochMs: Date.now() + 90_000_000,
  location: '',
  description: '',
  allDay: false,
  allowUploads: false,
  audience: 'both',
});

/** Driven by the *end* time, so an event in progress is not filed as past. */
function statusOf(event) {
  const now = Date.now();
  const start = event.startEpochMs ?? 0;
  const end = event.endEpochMs ?? start;
  if (now < start) return 'upcoming';
  if (now <= end) return 'ongoing';
  return 'past';
}

const STATUS_TONE = { upcoming: 'cool', ongoing: 'good', past: 'quiet' };

/**
 * Everything the server would reject, keyed by the box it belongs under. The
 * `schedule` key is not a field — it hangs the "ends before it starts" message
 * on the step rather than on one of the two datetime inputs.
 */
function problems(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Give the event a name.';
  if (!form.location.trim()) errors.location = 'Where is it?';
  if (!form.description.trim()) errors.description = 'A one-line description is required.';
  if (form.endEpochMs < form.startEpochMs) errors.schedule = 'It cannot end before it starts.';
  return errors;
}

const STEPS = [
  { id: 'details', label: 'Details', icon: FileText, fields: ['name', 'location', 'description'] },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock, fields: ['schedule'] },
  { id: 'review', label: 'Review', icon: ClipboardCheck, fields: [] },
];

/**
 * The calendar behind every board.
 *
 * Creating and editing happen in a wizard rather than an inline form: events
 * carry seven fields including two datetimes, and an inline form pushed the
 * rest of the list off screen exactly when someone wanted to check what they
 * were about to collide with.
 *
 * Past events are hidden by default. The list only grows, and by the second
 * term the useful half is at the bottom.
 */
export default function EventsEditor({ events, onUpdate }) {
  const { can } = useAuth();
  const toast = useToast();

  const canWrite = can(PERMISSIONS.BOARD_EVENT_WRITE);
  /**
   * Linking writes the board event (`board:event:write`) but the picker reads
   * the tCketManage event list, which the security filter chain puts behind
   * `tcket:manage`. Someone holding only one of the two would get a picker that
   * 403s or a button the server refuses, so the control needs both.
   */
  const canLinkTickets = canWrite && can(PERMISSIONS.TCKET_MANAGE);

  const [editing, setEditing] = useState(null); // event object, or 'new'
  const [form, setForm] = useState(emptyEvent());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const liveProblems = useMemo(() => problems(form), [form]);
  const wiz = useWizard(STEPS, liveProblems);

  const [linking, setLinking] = useState(null);
  const [unlinking, setUnlinking] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('all');
  const [hidePast, setHidePast] = useState(true);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events
      .filter(
        (e) =>
          !needle ||
          e.name?.toLowerCase().includes(needle) ||
          e.location?.toLowerCase().includes(needle)
      )
      .filter((e) => audience === 'all' || e.audience === audience)
      .filter((e) => !hidePast || statusOf(e) !== 'past')
      .sort((a, b) => a.startEpochMs - b.startEpochMs);
  }, [events, query, audience, hidePast]);

  const pastCount = events.filter((e) => statusOf(e) === 'past').length;

  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  const openNew = () => {
    setForm(emptyEvent());
    setFormError(null);
    wiz.reset();
    setEditing('new');
  };

  const openEdit = (event) => {
    setForm({ ...event });
    setFormError(null);
    wiz.reset();
    setEditing(event);
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
      if (editing === 'new') {
        const created = await BoardService.createEvent(form);
        onUpdate([...events, created]);
        toast.success('Event created.');
      } else {
        const updated = await BoardService.updateEvent(editing.id, form);
        onUpdate(events.map((e) => (e.id === editing.id ? updated : e)));
        toast.success('Event updated.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await BoardService.deleteEvent(deleting.id);
    onUpdate(events.filter((e) => e.id !== deleting.id));
    toast.success('Event deleted.');
  };

  const link = async (ticketEvent) => {
    const boardEvent = linking;
    setLinking(null);
    try {
      const updated = await BoardService.linkTicketEvent(boardEvent.id, ticketEvent.id);
      onUpdate(events.map((e) => (e.id === boardEvent.id ? updated : e)));
      toast.success(`Linked "${ticketEvent.name}".`);
    } catch (err) {
      toast.error('Could not link the ticketed event.', { detail: err.message });
    }
  };

  const unlink = async () => {
    const updated = await BoardService.unlinkTicketEvent(unlinking.id);
    onUpdate(events.map((e) => (e.id === unlinking.id ? updated : e)));
    toast.success('Tickets unlinked.');
  };

  const creating = editing === 'new';
  const reviewPrimary = {
    label: creating ? 'Create event' : 'Save changes',
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
          placeholder="Search events"
          className="w-full sm:w-64"
        />
        <SegmentedControl
          size="sm"
          value={audience}
          onChange={setAudience}
          options={[{ value: 'all', label: 'All' }, ...AUDIENCE_OPTIONS]}
        />
        <Checkbox
          checked={hidePast}
          onChange={setHidePast}
          label={`Hide past${pastCount ? ` (${pastCount})` : ''}`}
        />
        {canWrite && (
          <Button variant="primary" icon={Plus} onClick={openNew} className="ml-auto">
            New event
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={events.length === 0 ? 'No events yet' : 'Nothing matches'}
          body={
            events.length === 0
              ? 'Events feed the agenda and today-schedule frames on every board.'
              : hidePast && pastCount > 0
                ? `${pastCount} past event${pastCount === 1 ? '' : 's'} are hidden.`
                : undefined
          }
          action={
            canWrite && events.length === 0 ? (
              <Button variant="primary" icon={Plus} onClick={openNew}>
                New event
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((event, i) => {
            const status = statusOf(event);
            return (
              <li
                key={event.id}
                style={{ '--i': Math.min(i, 12) }}
                className={`anim-stagger bg-surface border rounded-lg shadow-sm px-4 py-3.5 ${
                  status === 'ongoing' ? 'border-good/35' : 'border-hair'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 text-center">
                    <div className="cap">
                      {new Date(event.startEpochMs).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="font-display text-xl text-ink tabular leading-tight mt-0.5">
                      {new Date(event.startEpochMs).getDate()}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[14px] text-ink">{event.name}</h4>
                      <AudienceBadge audience={event.audience} />
                      {status !== 'upcoming' && (
                        <Badge tone={STATUS_TONE[status]} size="sm">
                          {status}
                        </Badge>
                      )}
                      {event.ticketEvent && (
                        <Badge tone="ember" size="sm" icon={Ticket}>
                          {event.ticketEvent.name}
                        </Badge>
                      )}
                      {event.allowUploads && (
                        <Badge tone="quiet" size="sm" icon={ImagePlus}>
                          uploads open
                        </Badge>
                      )}
                    </div>

                    <p className="text-[12px] text-muted mt-1 line-clamp-2">{event.description}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} className="text-faint" />
                        {event.allDay
                          ? 'All day'
                          : `${new Date(event.startEpochMs).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })} – ${new Date(event.endEpochMs).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}`}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-faint" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-1 shrink-0">
                      {canLinkTickets &&
                        (event.ticketEvent ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Link2Off}
                            aria-label="Unlink tickets"
                            title="Detach the ticketed event"
                            onClick={() => setUnlinking(event)}
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Ticket}
                            aria-label="Link tickets"
                            title="Attach a ticketed event"
                            onClick={() => setLinking(event)}
                          />
                        ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit2}
                        aria-label="Edit"
                        onClick={() => openEdit(event)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label="Delete"
                        className="text-faint hover:text-bad"
                        onClick={() => setDeleting(event)}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <WizardShell
        open={!!editing}
        title={creating ? 'New event' : 'Edit event'}
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
            <StepIntro title="Details">
              What the event is, and who it is for. The description is one line — it has to read
              from across a room.
            </StepIntro>

            <Field label="Name" htmlFor="ev-name" required error={wiz.showErr('name')}>
              <Input
                id="ev-name"
                autoFocus
                value={form.name}
                error={wiz.showErr('name')}
                placeholder="Weekly halaqa"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor="ev-location" required error={wiz.showErr('location')}>
                <Input
                  id="ev-location"
                  value={form.location}
                  error={wiz.showErr('location')}
                  placeholder="Room 2080"
                  onChange={(e) => patch({ location: e.target.value })}
                />
              </Field>
              <Field label="Audience" htmlFor="ev-audience">
                <Select
                  id="ev-audience"
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
              label="Description"
              htmlFor="ev-description"
              required
              error={wiz.showErr('description')}
            >
              <Textarea
                id="ev-description"
                rows={2}
                value={form.description}
                error={wiz.showErr('description')}
                placeholder="One line. It has to read from across a room."
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
          </div>
        )}

        {wiz.index === 1 && (
          <div className="space-y-4">
            <StepIntro title="Schedule">
              When it runs. Mark it all-day and the boards drop the times and show only the date.
            </StepIntro>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="ev-start">
                <Input
                  id="ev-start"
                  type="datetime-local"
                  value={toLocalInput(form.startEpochMs)}
                  onChange={(e) => patch({ startEpochMs: new Date(e.target.value).getTime() })}
                />
              </Field>
              <Field
                label="Ends"
                htmlFor="ev-end"
                error={wiz.showErr('schedule')}
              >
                <Input
                  id="ev-end"
                  type="datetime-local"
                  error={wiz.showErr('schedule')}
                  value={toLocalInput(form.endEpochMs)}
                  onChange={(e) => patch({ endEpochMs: new Date(e.target.value).getTime() })}
                />
              </Field>
            </div>

            <Checkbox
              checked={form.allDay}
              onChange={(v) => patch({ allDay: v })}
              label="All-day event"
            />
          </div>
        )}

        {wiz.isLast && (
          <div>
            <StepIntro title="Review">
              Check it over, then {creating ? 'create it' : 'save your changes'}. The submissions
              toggle is here because it is easy to leave on by mistake.
            </StepIntro>

            <div className="grid gap-x-8 sm:grid-cols-2">
              <KeyValue label="Name" prose>
                {form.name || null}
              </KeyValue>
              <KeyValue label="Location" prose>
                {form.location || null}
              </KeyValue>
              <KeyValue label="Audience" prose>
                {AUDIENCE_LABELS[form.audience] ?? form.audience}
              </KeyValue>
              <KeyValue label="When" prose>
                {form.allDay
                  ? `${new Date(form.startEpochMs).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })} · all day`
                  : `${fmtWhen(form.startEpochMs)} → ${fmtWhen(form.endEpochMs)}`}
              </KeyValue>
            </div>

            <p className="mt-4 text-[13px] text-soft leading-relaxed">{form.description}</p>

            <div className="mt-5 pt-4 border-t border-hair">
              {/* Opens this event to media submissions from the Minbar app. Off by
                  default: an event nobody was told to photograph should not appear
                  in the submitter's event picker. */}
              <Checkbox
                checked={form.allowUploads}
                onChange={(v) => patch({ allowUploads: v })}
                label="Accept media submissions for this event"
              />
            </div>
          </div>
        )}
      </WizardShell>

      <TicketEventPicker
        open={!!linking}
        boardEventName={linking?.name ?? ''}
        currentId={linking?.ticketEvent?.id}
        onSelect={link}
        onClose={() => setLinking(null)}
      />

      <ConfirmDialog
        open={!!unlinking}
        onClose={() => setUnlinking(null)}
        onConfirm={unlink}
        tone="secondary"
        title="Detach the ticketed event?"
        confirmLabel="Detach"
        body={
          <>
            <span className="text-ink">{unlinking?.ticketEvent?.name}</span> stops being reachable
            from this board event. The ticketed event itself, and every ticket already sold, are
            untouched — this only removes the link.
          </>
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this event?"
        confirmLabel="Delete"
        body={
          <>
            <span className="text-ink">{deleting?.name}</span> disappears from every board that
            was showing it. Media already submitted against it is not deleted.
          </>
        }
      />
    </div>
  );
}
