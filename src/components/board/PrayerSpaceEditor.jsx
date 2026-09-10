import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Footprints,
  Image as ImageIcon,
  LocateFixed,
  MapPin,
  MapPinOff,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import PrayerSpaceService from '../../services/PrayerSpaceService';
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
  PRAYER_SPACE_TYPES,
  defaultAudienceForSpaceType,
  prayerSpaceTypeLabel,
} from '../../models/board';
import {
  Button,
  Field,
  Input,
  KeyValue,
  Select,
  StepIntro,
  Textarea,
  WizardShell,
  useToast,
} from '../ui';
import useGeolocation from '../../hooks/useGeolocation';
import useWizard from '../../hooks/useWizard';

/**
 * Create or edit one prayer space, as a wizard.
 *
 * The form is long — twenty fields and three lists — so it is walked one
 * question at a time, in the order someone finding a room actually asks them:
 * what is it, where is it, how does it look on a phone, how do you walk there,
 * and finally a page to check before it is written. The frame, the step rail
 * and the blocked-primary shake are `WizardShell`'s, shared with the events
 * wizard in the sibling console.
 *
 * Three things about it are contract, not taste:
 *
 *   - There is no "summary" field. The app composes "2 min walk from the CCT
 *     main entrance" out of `walkTimeMinutes` and `startingPoint`, so those are
 *     the boxes; writing the sentence by hand is not an option the API offers.
 *   - A save sends only what changed (`PrayerSpaceService.changes`). Fixing a
 *     typo in step 3 must not re-send nineteen untouched fields over whatever
 *     somebody else edited in the meantime.
 *   - Coordinates go in as a pair or not at all. The "Use my location" button
 *     fills both from the browser; a partial pair is a point in the ocean.
 */

/** Server messages, mapped to the box they belong under. Most specific first. */
const SERVER_MESSAGE_FIELDS = [
  [/latitude and longitude/i, 'latitude'],
  [/latitude/i, 'latitude'],
  [/longitude/i, 'longitude'],
  [/capacity/i, 'capacity'],
  [/walk time/i, 'walkTimeMinutes'],
  [/maps url/i, 'mapsUrl'],
  [/image url/i, 'imageUrl'],
  [/instruction/i, 'steps'],
  [/entrance/i, 'entranceName'],
  [/^name|name is required/i, 'name'],
  [/tag/i, 'tag'],
  [/building/i, 'building'],
];

function fieldForServerMessage(message) {
  return SERVER_MESSAGE_FIELDS.find(([pattern]) => pattern.test(message ?? ''))?.[1] ?? null;
}

/**
 * A link the app will hand to a phone. A malformed one still renders on the
 * card and fails only when somebody taps it, standing in a corridor.
 * @returns {string} the problem, or '' when the value is fine or empty
 */
function urlProblem(value, label) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return `Enter a complete ${label}, including https://`;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http:// and https:// links can be opened from the app.';
  }
  return '';
}

function numberOrNull(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Everything the server would reject, checked here so it comes back as a
 * message under the box rather than a toast about the whole form.
 *
 * `before` is null when creating. On an edit it carries the one rule that is
 * not a validation at all but a shape of the API: a null number means "leave it
 * alone", so a number that has been stored cannot be cleared, only changed.
 */
function problems(form, before) {
  const errors = {};

  const required = (field, message) => {
    const value = form[field].trim();
    if (!value) errors[field] = message;
    else if (value.length > 255) errors[field] = 'Capped at 255 characters.';
  };

  required('name', 'Give the space a name.');
  required('tag', 'Give it a short tag — the app prints it under the name.');
  required('building', 'Say which building it is in.');

  for (const field of ['floor', 'roomInfo', 'startingPoint', 'entranceName', 'entranceDescription']) {
    if (form[field].trim().length > 255) errors[field] = 'Capped at 255 characters.';
  }

  const capacity = numberOrNull(form.capacity);
  if (form.capacity.trim() && (capacity === null || !Number.isInteger(capacity) || capacity < 1)) {
    errors.capacity = 'Capacity must be a whole number above zero.';
  }

  const walkTime = numberOrNull(form.walkTimeMinutes);
  if (form.walkTimeMinutes.trim() && (walkTime === null || !Number.isInteger(walkTime) || walkTime < 0)) {
    errors.walkTimeMinutes = 'Walk time must be a whole number of minutes, and cannot be negative.';
  }

  const hasLat = form.latitude.trim() !== '';
  const hasLon = form.longitude.trim() !== '';
  const latitude = numberOrNull(form.latitude);
  const longitude = numberOrNull(form.longitude);

  if (hasLat !== hasLon) {
    errors[hasLat ? 'longitude' : 'latitude'] =
      'Coordinates go in as a pair. One on its own is not half a location, it is a point in the ocean.';
  }
  if (hasLat && (latitude === null || latitude < -90 || latitude > 90)) {
    errors.latitude = 'Latitude must be between -90 and 90.';
  }
  if (hasLon && (longitude === null || longitude < -180 || longitude > 180)) {
    errors.longitude = 'Longitude must be between -180 and 180.';
  }

  const mapsProblem = urlProblem(form.mapsUrl, 'link');
  if (mapsProblem) errors.mapsUrl = mapsProblem;
  const imageProblem = urlProblem(form.imageUrl, 'image URL');
  if (imageProblem) errors.imageUrl = imageProblem;

  if (form.steps.some((step) => !step.instruction.trim())) {
    errors.steps = 'Every step needs an instruction. Fill the empty one in, or remove it.';
  }

  // Emptying both coordinate boxes is a real edit — it travels as
  // `clearCoordinates` and un-pins the space — so it is not checked here. The
  // other two numbers have no such flag: null means "leave alone", and a
  // stored capacity or walk time can be corrected but not removed.
  if (before) {
    for (const field of ['capacity', 'walkTimeMinutes']) {
      if (before[field] != null && !form[field].trim()) {
        errors[field] =
          'This cannot be emptied — the API reads a missing number as "leave it alone". Put a number back, or leave the old one.';
      }
    }
  }

  return errors;
}

/**
 * The wizard's steps, and — for `fields` — which boxes each one owns. A step
 * cannot be left while one of its fields has a problem, and a field's error is
 * only shown once its step has been attempted, so the first screen is not red
 * before anything has been typed.
 */
const STEPS = [
  { id: 'identity', label: 'Identity', icon: Tag, fields: ['name', 'tag'] },
  {
    id: 'where',
    label: 'Where',
    icon: MapPin,
    fields: ['building', 'floor', 'roomInfo', 'capacity', 'latitude', 'longitude', 'mapsUrl'],
  },
  { id: 'presentation', label: 'Presentation', icon: ImageIcon, fields: ['imageUrl'] },
  {
    id: 'directions',
    label: 'Directions',
    icon: Footprints,
    fields: ['startingPoint', 'walkTimeMinutes', 'entranceName', 'entranceDescription', 'steps'],
  },
  { id: 'review', label: 'Review', icon: ClipboardCheck, fields: [] },
];

const LAST_STEP = STEPS.length - 1;

/** field name → the step index that owns it, so an error can find its screen. */
const STEP_OF_FIELD = STEPS.reduce((map, step, index) => {
  for (const field of step.fields) map[field] = index;
  return map;
}, {});

/**
 * An unordered list of short strings — amenities, tips.
 *
 * A row per value rather than a comma-separated box: these end up as chips on a
 * card, and a comma inside one ("wudu area, ground floor") would silently split
 * into two.
 */
function StringList({ label, hint, error, values, onChange, placeholder, addLabel }) {
  const set = (index, value) => onChange(values.map((v, i) => (i === index ? value : v)));
  const remove = (index) => onChange(values.filter((_, i) => i !== index));

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={value}
              placeholder={placeholder}
              onChange={(e) => set(index, e.target.value)}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              className="text-faint hover:text-bad shrink-0"
              onClick={() => remove(index)}
            />
          </div>
        ))}
        <Button size="sm" icon={Plus} onClick={() => onChange([...values, ''])}>
          {addLabel}
        </Button>
      </div>
    </Field>
  );
}

export default function PrayerSpaceEditor({ open, space, onSaved, onClose }) {
  const toast = useToast();
  const creating = !space;

  const [form, setForm] = useState(() => PrayerSpaceService.emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  // Errors the server sent back, keyed by field. Cleared on every save attempt.
  const [serverErrors, setServerErrors] = useState({});
  // Once somebody picks an audience by hand, the room type stops overriding it.
  const [audiencePicked, setAudiencePicked] = useState(false);

  const liveProblems = useMemo(() => problems(form, space), [form, space]);
  const wiz = useWizard(STEPS, liveProblems, serverErrors);
  const { reset: resetWizard } = wiz;
  const stepIndex = wiz.index;
  const showErr = wiz.showErr;

  const {
    locating,
    error: geoError,
    accuracy: geoAccuracy,
    locate,
    reset: resetGeo,
  } = useGeolocation();

  // Reseed whenever the dialog opens, so a cancelled edit cannot leak into the
  // next one and so the baseline a save diffs against is the record just loaded.
  useEffect(() => {
    if (!open) return;
    setForm(space ? PrayerSpaceService.toForm(space) : PrayerSpaceService.emptyForm());
    setFormError(null);
    setServerErrors({});
    setAudiencePicked(false);
    resetWizard();
    resetGeo();
  }, [open, space, resetWizard, resetGeo]);

  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  /**
   * On create the audience follows the room type until it is set by hand —
   * which is exactly what the server does with an omitted `audience`, made
   * visible. On edit it never moves: the server does not re-derive there, and
   * silently re-listing a sisters-only reflection bay to the whole campus
   * because somebody corrected its type is not a fix, it is an incident.
   */
  const changeType = (type) => {
    if (creating && !audiencePicked) {
      patch({ type, audience: defaultAudienceForSpaceType(type) });
    } else {
      patch({ type });
    }
  };

  const changeAudience = (audience) => {
    setAudiencePicked(true);
    patch({ audience });
  };

  const audienceHint = creating
    ? audiencePicked
      ? 'Set by hand — it no longer follows the room type.'
      : `Following the room type. Leave it and the space is listed to ${
          form.audience === 'both' ? 'everyone' : form.audience
        }.`
    : 'Who the space is listed to. Changing the room type does not move it — the server never re-derives audience on an edit.';

  // On an edit, the diff is also the answer to "is there anything to save".
  const pending = useMemo(
    () => (space ? PrayerSpaceService.changes(space, form) : null),
    [space, form]
  );
  const dirty = creating || Object.keys(pending ?? {}).length > 0;

  const setStep = (index, changes) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === index ? { ...s, ...changes } : s)),
    }));

  const moveStep = (index, delta) =>
    setForm((f) => {
      const next = [...f.steps];
      const target = index + delta;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, steps: next };
    });

  const fillFromLocation = () =>
    locate(({ latitude, longitude }) => {
      patch({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) });
      setServerErrors((e) => ({ ...e, latitude: undefined, longitude: undefined }));
    });

  const save = async () => {
    const found = problems(form, space);
    if (Object.keys(found).length > 0) {
      const bad = STEPS.findIndex((s) => s.fields.some((field) => found[field]));
      wiz.revealThrough(bad === -1 ? LAST_STEP : bad);
      if (bad !== -1) wiz.setIndex(bad);
      setFormError('Some of this will not save yet — the step with the problem is open below.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setServerErrors({});
    try {
      if (creating) {
        const created = await PrayerSpaceService.create(form);
        toast.success(`${created.name} created.`);
        onSaved(created, true);
      } else {
        if (Object.keys(pending).length === 0) {
          onClose();
          return;
        }
        const updated = await PrayerSpaceService.update(space.id, pending);
        toast.success(`${updated.name} updated.`);
        onSaved(updated, false);
      }
    } catch (err) {
      // The API answers with a MessageResponse carrying a sentence a person
      // wrote. Show it whole, and put it under the box it names when it names
      // one — opening that box's step on the way.
      setFormError(err.message);
      const field = fieldForServerMessage(err.message);
      if (field) {
        setServerErrors({ [field]: err.message });
        const owningStep = STEP_OF_FIELD[field];
        if (owningStep != null) {
          wiz.setIndex(owningStep);
          wiz.reveal(owningStep);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const reviewPrimary = {
    label: creating ? 'Create space' : dirty ? 'Save changes' : 'Close',
    icon: creating ? Plus : dirty ? ClipboardCheck : undefined,
    busy: saving,
    busyLabel: creating ? 'Creating…' : 'Saving…',
    onClick: dirty ? save : onClose,
  };

  const cleanCount = (list) => list.filter((v) => v.trim()).length;
  const realSteps = form.steps.filter((s) => s.instruction.trim()).length;

  return (
    <WizardShell
      open={open}
      title={creating ? 'New prayer space' : space.name}
      steps={STEPS}
      step={open ? stepIndex : 0}
      onStepChange={wiz.go}
      onClose={onClose}
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

      {stepIndex === 0 && (
        <div className="space-y-4">
          <StepIntro title="Identity">
            The name and tag are what the card shows before anyone taps it. The room type sets
            the label and the map filter; who it is listed to follows from the type until you
            say otherwise.
          </StepIntro>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="ps-name" required error={showErr('name')}>
              <Input
                id="ps-name"
                value={form.name}
                error={showErr('name')}
                placeholder="CCT Prayer Room"
                autoFocus
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field
              label="Tag"
              htmlFor="ps-tag"
              required
              error={showErr('tag')}
              hint={showErr('tag') ? undefined : 'The short line under the name on the card.'}
            >
              <Input
                id="ps-tag"
                value={form.tag}
                error={showErr('tag')}
                placeholder="Brothers · CCT"
                onChange={(e) => patch({ tag: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Room type"
              htmlFor="ps-type"
              hint="What kind of room it is: the label on the card and the filter on the map."
            >
              <Select id="ps-type" value={form.type} onChange={(e) => changeType(e.target.value)}>
                {PRAYER_SPACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Listed to" htmlFor="ps-audience" hint={audienceHint}>
              <Select
                id="ps-audience"
                value={form.audience}
                onChange={(e) => changeAudience(e.target.value)}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {stepIndex === 1 && (
        <div className="space-y-4">
          <StepIntro title="Where">
            The building is what a student searches. The pin is what lets the app draw a dot and
            offer to navigate — drop it from where you are standing, or type it in.
          </StepIntro>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Building" htmlFor="ps-building" required error={showErr('building')}>
              <Input
                id="ps-building"
                value={form.building}
                error={showErr('building')}
                placeholder="Communication, Culture & Technology"
                onChange={(e) => patch({ building: e.target.value })}
              />
            </Field>
            <Field label="Floor" htmlFor="ps-floor" error={showErr('floor')}>
              <Input
                id="ps-floor"
                value={form.floor}
                error={showErr('floor')}
                placeholder="Level 1"
                onChange={(e) => patch({ floor: e.target.value })}
              />
            </Field>
            <Field
              label="Room"
              htmlFor="ps-room"
              error={showErr('roomInfo')}
              hint={showErr('roomInfo') ? undefined : 'Room number, or how the door is signed.'}
            >
              <Input
                id="ps-room"
                value={form.roomInfo}
                error={showErr('roomInfo')}
                placeholder="CC 1140"
                onChange={(e) => patch({ roomInfo: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Capacity"
              htmlFor="ps-capacity"
              error={showErr('capacity')}
              hint={showErr('capacity') ? undefined : 'Roughly how many can pray at once.'}
            >
              <Input
                id="ps-capacity"
                type="number"
                min="1"
                value={form.capacity}
                error={showErr('capacity')}
                onChange={(e) => patch({ capacity: e.target.value })}
              />
            </Field>
            <Field
              className="sm:col-span-2"
              label="Maps link"
              htmlFor="ps-maps"
              error={showErr('mapsUrl')}
              hint={
                showErr('mapsUrl')
                  ? undefined
                  : 'Optional. Opens in whatever maps app the phone uses.'
              }
            >
              <Input
                id="ps-maps"
                type="url"
                placeholder="https://"
                value={form.mapsUrl}
                error={showErr('mapsUrl')}
                onChange={(e) => patch({ mapsUrl: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="text-[12px] font-medium text-muted tracking-wide">Coordinates</p>
              <Button
                size="xs"
                variant="secondary"
                icon={LocateFixed}
                loading={locating}
                onClick={fillFromLocation}
              >
                {locating ? 'Locating…' : 'Use my location'}
              </Button>
              {geoAccuracy != null && !geoError && (
                <span className="text-[12px] text-muted">
                  Filled from this device · accurate to about {Math.round(geoAccuracy)} m
                </span>
              )}
              {geoError && <span className="text-[12px] text-bad">{geoError}</span>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="ps-lat" error={showErr('latitude')}>
                <Input
                  id="ps-lat"
                  inputMode="decimal"
                  value={form.latitude}
                  error={showErr('latitude')}
                  placeholder="43.5489"
                  onChange={(e) => patch({ latitude: e.target.value })}
                />
              </Field>
              <Field
                label="Longitude"
                htmlFor="ps-lon"
                error={showErr('longitude')}
                hint={
                  showErr('longitude')
                    ? undefined
                    : 'Both or neither. Empty them both to un-pin the space; without a pin the app cannot offer to navigate to it.'
                }
              >
                <Input
                  id="ps-lon"
                  inputMode="decimal"
                  value={form.longitude}
                  error={showErr('longitude')}
                  placeholder="-79.6625"
                  onChange={(e) => patch({ longitude: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {stepIndex === 2 && (
        <div className="space-y-4">
          <StepIntro title="Presentation">
            What the space looks like in the app before anyone walks to it.
          </StepIntro>

          <Field label="Photo URL" htmlFor="ps-image" error={showErr('imageUrl')}>
            <Input
              id="ps-image"
              type="url"
              placeholder="https://"
              value={form.imageUrl}
              error={showErr('imageUrl')}
              onChange={(e) => patch({ imageUrl: e.target.value })}
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="ps-notes"
            hint="Anything that does not fit the fields above — access hours, term-time closures."
          >
            <Textarea
              id="ps-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>

          <StringList
            label="Amenities"
            hint="Shown as chips on the card. One per line: wudu area, shoe rack, barrier."
            values={form.amenities}
            onChange={(amenities) => patch({ amenities })}
            placeholder="Wudu area"
            addLabel="Add amenity"
          />
        </div>
      )}

      {stepIndex === 3 && (
        <div className="space-y-4">
          <StepIntro title="Directions">
            The app writes its own summary line out of the walk time and the starting point —
            there is no sentence to type. The steps below are what somebody reads while walking.
          </StepIntro>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starting point"
              htmlFor="ps-start"
              error={showErr('startingPoint')}
              hint={showErr('startingPoint') ? undefined : 'Where the directions begin.'}
            >
              <Input
                id="ps-start"
                value={form.startingPoint}
                error={showErr('startingPoint')}
                placeholder="the CCT main entrance"
                onChange={(e) => patch({ startingPoint: e.target.value })}
              />
            </Field>
            <Field
              label="Walk time (minutes)"
              htmlFor="ps-walk"
              error={showErr('walkTimeMinutes')}
              hint={showErr('walkTimeMinutes') ? undefined : 'From the starting point, at a walk.'}
            >
              <Input
                id="ps-walk"
                type="number"
                min="0"
                value={form.walkTimeMinutes}
                error={showErr('walkTimeMinutes')}
                onChange={(e) => patch({ walkTimeMinutes: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entrance" htmlFor="ps-entrance" error={showErr('entranceName')}>
              <Input
                id="ps-entrance"
                value={form.entranceName}
                error={showErr('entranceName')}
                placeholder="North doors"
                onChange={(e) => patch({ entranceName: e.target.value })}
              />
            </Field>
            <Field
              label="Entrance description"
              htmlFor="ps-entrance-desc"
              error={showErr('entranceDescription')}
              hint={
                showErr('entranceDescription')
                  ? undefined
                  : 'How to recognise it from outside.'
              }
            >
              <Input
                id="ps-entrance-desc"
                value={form.entranceDescription}
                error={showErr('entranceDescription')}
                placeholder="Glass doors beside the bike racks"
                onChange={(e) => patch({ entranceDescription: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[12px] font-medium text-muted tracking-wide">Steps</p>
              <Button
                size="sm"
                icon={Plus}
                onClick={() =>
                  setForm((f) => ({ ...f, steps: [...f.steps, { instruction: '', subtext: '' }] }))
                }
              >
                Add step
              </Button>
            </div>

            {showErr('steps') && <p className="mb-2 text-[12px] text-bad">{showErr('steps')}</p>}

            {form.steps.length === 0 ? (
              <p className="text-[12.5px] text-muted leading-relaxed">
                No steps. The app falls back to the prose directions below, which is fine for a
                room you can see from the door and thin for anything else.
              </p>
            ) : (
              <div className="space-y-2">
                {form.steps.map((step, index) => (
                  <div key={index} className="bg-raised border border-hair rounded-md px-3.5 py-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="shrink-0 w-5 h-5 rounded-full bg-ember-dim text-ember
                                   grid place-items-center text-[10px] font-mono"
                      >
                        {index + 1}
                      </span>
                      <div className="ml-auto flex items-center gap-0.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={ChevronUp}
                          aria-label="Move step up"
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={ChevronDown}
                          aria-label="Move step down"
                          disabled={index === form.steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={Trash2}
                          aria-label="Remove step"
                          className="text-faint hover:text-bad"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              steps: f.steps.filter((_, i) => i !== index),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Instruction">
                        <Input
                          value={step.instruction}
                          placeholder="Take the stairs to Level 1"
                          onChange={(e) => setStep(index, { instruction: e.target.value })}
                        />
                      </Field>
                      <Field label="Landmark">
                        <Input
                          value={step.subtext}
                          placeholder="You'll pass the Tim Hortons"
                          onChange={(e) => setStep(index, { subtext: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field
            label="Prose directions"
            htmlFor="ps-directions"
            hint="The fallback the app shows when there are no steps."
          >
            <Textarea
              id="ps-directions"
              rows={3}
              value={form.directions}
              onChange={(e) => patch({ directions: e.target.value })}
            />
          </Field>

          <StringList
            label="Tips"
            hint="Things you only learn by going: which door is locked after six, where the sisters' entrance is."
            values={form.tips}
            onChange={(tips) => patch({ tips })}
            placeholder="The north door locks at 18:00"
            addLabel="Add tip"
          />
        </div>
      )}

      {stepIndex === LAST_STEP && (
        <div>
          <StepIntro title="Review">
            {creating
              ? 'Check it over, then create it. Everything here can be edited afterwards.'
              : dirty
                ? `${Object.keys(pending).length} ${
                    Object.keys(pending).length === 1 ? 'field' : 'fields'
                  } changed since you opened this — the save sends only those.`
                : 'Nothing has changed since you opened this.'}
          </StepIntro>

          <div className="grid gap-x-8 sm:grid-cols-2">
            <KeyValue label="Name" prose>
              {form.name || null}
            </KeyValue>
            <KeyValue label="Tag" prose>
              {form.tag || null}
            </KeyValue>
            <KeyValue label="Type" prose>
              {prayerSpaceTypeLabel(form.type)}
            </KeyValue>
            <KeyValue label="Listed to" prose>
              {AUDIENCE_LABELS[form.audience] ?? form.audience}
            </KeyValue>
            <KeyValue label="Building" prose>
              {form.building || null}
            </KeyValue>
            <KeyValue label="Floor / room" prose>
              {[form.floor, form.roomInfo].filter(Boolean).join(' · ') || null}
            </KeyValue>
            <KeyValue label="Capacity">{form.capacity || null}</KeyValue>
            <KeyValue label="Coordinates">
              {form.latitude && form.longitude
                ? `${form.latitude}, ${form.longitude}`
                : null}
            </KeyValue>
            <KeyValue label="Walk" prose>
              {form.walkTimeMinutes
                ? `${form.walkTimeMinutes} min${
                    form.startingPoint ? ` from ${form.startingPoint}` : ''
                  }`
                : null}
            </KeyValue>
            <KeyValue label="Directions">
              {realSteps > 0
                ? `${realSteps} step${realSteps === 1 ? '' : 's'}`
                : form.directions.trim()
                  ? 'prose'
                  : null}
            </KeyValue>
            <KeyValue label="Amenities">{cleanCount(form.amenities) || null}</KeyValue>
            <KeyValue label="Tips">{cleanCount(form.tips) || null}</KeyValue>
          </div>

          {!form.latitude && (
            <p className="mt-4 flex items-start gap-2 text-[12px] text-warn leading-relaxed">
              <MapPinOff size={13} className="mt-0.5 shrink-0" />
              No coordinates, so the app cannot drop a pin or offer to navigate here — the
              written directions are all a student gets. Go back to <span className="text-ink">Where</span> to
              add one.
            </p>
          )}
        </div>
      )}
    </WizardShell>
  );
}
