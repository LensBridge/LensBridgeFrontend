import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import PrayerSpaceService from '../../services/PrayerSpaceService';
import {
  AUDIENCE_OPTIONS,
  PRAYER_SPACE_TYPES,
  defaultAudienceForSpaceType,
} from '../../models/board';
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '../ui';

/**
 * Create or edit one prayer space.
 *
 * The form is long — twenty fields and three lists — so it is grouped by the
 * question each group answers: what is it, where is it, how does it look on a
 * phone, and how do you walk there. That last group is the one people actually
 * come here to fix.
 *
 * Two things about it are contract, not taste:
 *
 *   - There is no "summary" field. The app composes "2 min walk from the CCT
 *     main entrance" out of `walkTimeMinutes` and `startingPoint`, so those are
 *     the boxes; writing the sentence by hand is not an option the API offers.
 *   - A save sends only what changed (`PrayerSpaceService.changes`). Fixing a
 *     typo in step 3 must not re-send nineteen untouched fields over whatever
 *     somebody else edited in the meantime.
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

/** A titled run of fields, ruled off from the one above it. */
function FormSection({ title, note, children }) {
  return (
    <section className="pt-5 first:pt-0 border-t first:border-t-0 border-hair">
      <p className="cap">{title}</p>
      {note && <p className="mt-1.5 text-[12px] text-muted leading-relaxed max-w-[62ch]">{note}</p>}
      <div className="mt-3.5 space-y-4">{children}</div>
    </section>
  );
}

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
  const [fieldErrors, setFieldErrors] = useState({});
  // Once somebody picks an audience by hand, the room type stops overriding it.
  const [audiencePicked, setAudiencePicked] = useState(false);

  // Reseed whenever the dialog opens, so a cancelled edit cannot leak into the
  // next one and so the baseline a save diffs against is the record just loaded.
  useEffect(() => {
    if (!open) return;
    setForm(space ? PrayerSpaceService.toForm(space) : PrayerSpaceService.emptyForm());
    setFormError(null);
    setFieldErrors({});
    setAudiencePicked(false);
  }, [open, space]);

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

  const save = async () => {
    const found = problems(form, space);
    if (Object.keys(found).length > 0) {
      setFieldErrors(found);
      setFormError('Some of this will not save as it stands — see the fields below.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setFieldErrors({});
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
      // wrote. Show it whole, and put it under the box it names when it names one.
      setFormError(err.message);
      const field = fieldForServerMessage(err.message);
      if (field) setFieldErrors({ [field]: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissable={!saving}
      size="lg"
      caption={creating ? 'Prayer spaces' : space.tag || 'Prayer space'}
      title={creating ? 'New prayer space' : `Edit ${space.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>
            {creating ? 'Create space' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {formError && (
          <p className="text-[13px] text-bad bg-bad-dim/50 border border-bad/30 rounded-md px-3.5 py-2.5">
            {formError}
          </p>
        )}

        <FormSection title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="ps-name" required error={fieldErrors.name}>
              <Input
                id="ps-name"
                value={form.name}
                error={fieldErrors.name}
                placeholder="CCT Prayer Room"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field
              label="Tag"
              htmlFor="ps-tag"
              required
              error={fieldErrors.tag}
              hint={fieldErrors.tag ? undefined : 'The short line under the name on the card.'}
            >
              <Input
                id="ps-tag"
                value={form.tag}
                error={fieldErrors.tag}
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
        </FormSection>

        <FormSection title="Where">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Building" htmlFor="ps-building" required error={fieldErrors.building}>
              <Input
                id="ps-building"
                value={form.building}
                error={fieldErrors.building}
                placeholder="Communication, Culture & Technology"
                onChange={(e) => patch({ building: e.target.value })}
              />
            </Field>
            <Field label="Floor" htmlFor="ps-floor" error={fieldErrors.floor}>
              <Input
                id="ps-floor"
                value={form.floor}
                error={fieldErrors.floor}
                placeholder="Level 1"
                onChange={(e) => patch({ floor: e.target.value })}
              />
            </Field>
            <Field
              label="Room"
              htmlFor="ps-room"
              error={fieldErrors.roomInfo}
              hint={fieldErrors.roomInfo ? undefined : 'Room number, or how the door is signed.'}
            >
              <Input
                id="ps-room"
                value={form.roomInfo}
                error={fieldErrors.roomInfo}
                placeholder="CC 1140"
                onChange={(e) => patch({ roomInfo: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Capacity"
              htmlFor="ps-capacity"
              error={fieldErrors.capacity}
              hint={fieldErrors.capacity ? undefined : 'Roughly how many can pray at once.'}
            >
              <Input
                id="ps-capacity"
                type="number"
                min="1"
                value={form.capacity}
                error={fieldErrors.capacity}
                onChange={(e) => patch({ capacity: e.target.value })}
              />
            </Field>
            <Field label="Latitude" htmlFor="ps-lat" error={fieldErrors.latitude}>
              <Input
                id="ps-lat"
                inputMode="decimal"
                value={form.latitude}
                error={fieldErrors.latitude}
                placeholder="43.5489"
                onChange={(e) => patch({ latitude: e.target.value })}
              />
            </Field>
            <Field
              label="Longitude"
              htmlFor="ps-lon"
              error={fieldErrors.longitude}
              hint={
                fieldErrors.longitude
                  ? undefined
                  : 'Both or neither. Empty them both to un-pin the space; without a pin the app cannot offer to navigate to it.'
              }
            >
              <Input
                id="ps-lon"
                inputMode="decimal"
                value={form.longitude}
                error={fieldErrors.longitude}
                placeholder="-79.6625"
                onChange={(e) => patch({ longitude: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="Maps link"
            htmlFor="ps-maps"
            error={fieldErrors.mapsUrl}
            hint={
              fieldErrors.mapsUrl
                ? undefined
                : 'Optional. Opens in whatever maps app the phone uses.'
            }
          >
            <Input
              id="ps-maps"
              type="url"
              placeholder="https://"
              value={form.mapsUrl}
              error={fieldErrors.mapsUrl}
              onChange={(e) => patch({ mapsUrl: e.target.value })}
            />
          </Field>
        </FormSection>

        <FormSection title="Presentation" note="What the space looks like in the app before anyone walks to it.">
          <Field label="Photo URL" htmlFor="ps-image" error={fieldErrors.imageUrl}>
            <Input
              id="ps-image"
              type="url"
              placeholder="https://"
              value={form.imageUrl}
              error={fieldErrors.imageUrl}
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
        </FormSection>

        <FormSection
          title="Directions"
          note="The app writes its own summary line out of the walk time and the starting point — there is no sentence to type. The steps below are what somebody reads while walking."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starting point"
              htmlFor="ps-start"
              error={fieldErrors.startingPoint}
              hint={fieldErrors.startingPoint ? undefined : 'Where the directions begin.'}
            >
              <Input
                id="ps-start"
                value={form.startingPoint}
                error={fieldErrors.startingPoint}
                placeholder="the CCT main entrance"
                onChange={(e) => patch({ startingPoint: e.target.value })}
              />
            </Field>
            <Field
              label="Walk time (minutes)"
              htmlFor="ps-walk"
              error={fieldErrors.walkTimeMinutes}
              hint={fieldErrors.walkTimeMinutes ? undefined : 'From the starting point, at a walk.'}
            >
              <Input
                id="ps-walk"
                type="number"
                min="0"
                value={form.walkTimeMinutes}
                error={fieldErrors.walkTimeMinutes}
                onChange={(e) => patch({ walkTimeMinutes: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entrance" htmlFor="ps-entrance" error={fieldErrors.entranceName}>
              <Input
                id="ps-entrance"
                value={form.entranceName}
                error={fieldErrors.entranceName}
                placeholder="North doors"
                onChange={(e) => patch({ entranceName: e.target.value })}
              />
            </Field>
            <Field
              label="Entrance description"
              htmlFor="ps-entrance-desc"
              error={fieldErrors.entranceDescription}
              hint={
                fieldErrors.entranceDescription
                  ? undefined
                  : 'How to recognise it from outside.'
              }
            >
              <Input
                id="ps-entrance-desc"
                value={form.entranceDescription}
                error={fieldErrors.entranceDescription}
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

            {fieldErrors.steps && <p className="mb-2 text-[12px] text-bad">{fieldErrors.steps}</p>}

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
        </FormSection>
      </div>
    </Modal>
  );
}
