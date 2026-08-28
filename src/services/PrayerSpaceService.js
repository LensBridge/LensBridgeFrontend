import { api } from '../api/client';

/**
 * Prayer spaces, as the console manages them.
 *
 * Its own class rather than five more methods on MinbarService, because "list
 * prayer spaces" would then mean two different things depending on which one
 * you called. MinbarService speaks for the *app*: `/api/minbar/prayer-spaces`
 * is filtered to one audience and is what a student is shown. Everything here
 * is `/api/admin/minbar/prayer-spaces` — every space regardless of audience,
 * behind `board:content:read` to look and `board:prayerspace:write` to change.
 * A console editing the sisters' musallah has to be able to load it whoever is
 * signed in, so the admin list is the one the management screen reads.
 *
 * The three shapes below are worth keeping straight:
 *
 *   - `fromApi` — the wire record, nulls flattened to '' and steps put in
 *     order. This is the baseline a save diffs against.
 *   - `toForm`  — the same record with its four numbers as strings, because a
 *     controlled `<input type="number">` cannot hold "-79." as a number while
 *     someone is still typing it.
 *   - `changes` — form minus baseline, which is the whole PATCH body.
 */

/** Required on create; '' on PATCH is a no-op server-side, not a clear. */
const REQUIRED_TEXT = ['name', 'tag', 'building'];

/** Optional text where PATCHing '' clears the field and omitting it leaves it alone. */
const CLEARABLE_TEXT = [
  'floor',
  'roomInfo',
  'mapsUrl',
  'imageUrl',
  'notes',
  'directions',
  'startingPoint',
  'entranceName',
  'entranceDescription',
];

/** Held as strings in the form; parsed on the way out. */
const NUMBER_FIELDS = ['capacity', 'walkTimeMinutes', 'latitude', 'longitude'];

/** A form box's text as a number, or null when it is empty or not one. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = (value ?? '').toString().trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Trimmed, with blanks dropped: every list item is `@NotBlank` server-side. */
function cleanList(values) {
  return (values ?? []).map((v) => (v ?? '').trim()).filter(Boolean);
}

function sameList(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function sameSteps(a, b) {
  return (
    a.length === b.length &&
    a.every((step, i) => step.instruction === b[i].instruction && step.subtext === b[i].subtext)
  );
}

class PrayerSpaceService {
  /** @template T @param {{data?: T, error?: {message?: string}}} r @param {string} fallback @returns {T} */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  // ==========================================================================
  // SHAPES
  // ==========================================================================

  /**
   * One `PrayerSpaceView` as the UI holds it.
   *
   * Nullable text lands as '' so every input is controlled from the first
   * render. `steps` is sorted by the server's `order` once, here, so nothing
   * downstream has to think about that field again — a write sends position in
   * the array and no order at all.
   */
  static fromApi(space) {
    return {
      id: space.id,
      name: space.name ?? '',
      tag: space.tag ?? '',
      type: space.type ?? 'multifaith',
      audience: space.audience ?? 'both',
      building: space.building ?? '',
      floor: space.floor ?? '',
      roomInfo: space.roomInfo ?? '',
      capacity: space.capacity ?? null,
      latitude: space.latitude ?? null,
      longitude: space.longitude ?? null,
      mapsUrl: space.mapsUrl ?? '',
      imageUrl: space.imageUrl ?? '',
      notes: space.notes ?? '',
      amenities: [...(space.amenities ?? [])],
      startingPoint: space.startingPoint ?? '',
      walkTimeMinutes: space.walkTimeMinutes ?? null,
      entranceName: space.entranceName ?? '',
      entranceDescription: space.entranceDescription ?? '',
      directions: space.directions ?? '',
      steps: [...(space.steps ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((step) => ({
          id: step.id,
          instruction: step.instruction ?? '',
          subtext: step.subtext ?? '',
        })),
      tips: [...(space.tips ?? [])],
    };
  }

  /** A record as the edit form holds it: numbers become the text in their box. */
  static toForm(record) {
    const form = { ...record, steps: record.steps.map((s) => ({ ...s })) };
    for (const field of NUMBER_FIELDS) {
      form[field] = record[field] == null ? '' : String(record[field]);
    }
    return form;
  }

  /** What a brand-new space starts as. Type and audience agree until told otherwise. */
  static emptyForm() {
    return {
      id: null,
      name: '',
      tag: '',
      type: 'brothers',
      audience: 'brothers',
      building: '',
      floor: '',
      roomInfo: '',
      capacity: '',
      latitude: '',
      longitude: '',
      mapsUrl: '',
      imageUrl: '',
      notes: '',
      amenities: [],
      startingPoint: '',
      walkTimeMinutes: '',
      entranceName: '',
      entranceDescription: '',
      directions: '',
      steps: [],
      tips: [],
    };
  }

  /**
   * The `CreatePrayerSpaceRequest` body for a form.
   *
   * Blank optional fields are omitted rather than sent as '', so the row stores
   * null and the app can tell "no room number" from "a room number that is the
   * empty string". `audience` is always sent: the form shows the value the
   * server would have derived, and sending the visible one is the difference
   * between a default and a silent decision.
   */
  static toCreateBody(form) {
    const body = {
      name: form.name.trim(),
      tag: form.tag.trim(),
      building: form.building.trim(),
      type: form.type,
      audience: form.audience,
    };

    for (const field of CLEARABLE_TEXT) {
      const value = form[field].trim();
      if (value) body[field] = value;
    }

    for (const field of ['capacity', 'walkTimeMinutes']) {
      const value = toNumber(form[field]);
      if (value !== null) body[field] = value;
    }

    // Sent as a pair or not at all; one on its own is a 400.
    const latitude = toNumber(form.latitude);
    const longitude = toNumber(form.longitude);
    if (latitude !== null && longitude !== null) {
      body.latitude = latitude;
      body.longitude = longitude;
    }

    const amenities = cleanList(form.amenities);
    const tips = cleanList(form.tips);
    const steps = form.steps
      .filter((step) => step.instruction.trim())
      .map((step) => ({ instruction: step.instruction.trim(), subtext: step.subtext.trim() }));

    if (amenities.length) body.amenities = amenities;
    if (tips.length) body.tips = tips;
    if (steps.length) body.steps = steps;

    return body;
  }

  /**
   * The `UpdatePrayerSpaceRequest` body: form minus baseline, and nothing else.
   *
   * Sending the whole form on every save would turn "I fixed a typo in step 3"
   * into a full overwrite, and would quietly stamp on whatever somebody else
   * changed between the load and the save. An empty object means there is
   * nothing to send and the caller should not make the request at all.
   *
   * Four asymmetries the server imposes:
   *
   *   - '' clears a `CLEARABLE_TEXT` field, so a cleared box travels as ''.
   *   - null means "leave alone" for a number, so a cleared `capacity` or
   *     `walkTimeMinutes` cannot be expressed at all. The form refuses to save
   *     in that state rather than dropping the edit here, where nobody would
   *     see it happen.
   *   - coordinates are the exception: emptying both boxes on a pinned space
   *     sends `clearCoordinates: true`, which is the only way to un-pin one.
   *     It is mutually exclusive with sending a coordinate — asking to clear
   *     and to set in one request is a 400 — so the two branches below cannot
   *     both fire.
   *   - lists replace wholesale, so a changed list travels complete.
   */
  static changes(before, form) {
    const patch = {};

    for (const field of [...REQUIRED_TEXT, ...CLEARABLE_TEXT]) {
      const next = form[field].trim();
      if (next !== before[field]) patch[field] = next;
    }

    if (form.type !== before.type) patch.type = form.type;
    if (form.audience !== before.audience) patch.audience = form.audience;

    for (const field of ['capacity', 'walkTimeMinutes']) {
      const next = toNumber(form[field]);
      if (next !== null && next !== before[field]) patch[field] = next;
    }

    const latitude = toNumber(form.latitude);
    const longitude = toNumber(form.longitude);
    const emptied = !form.latitude.trim() && !form.longitude.trim();

    if (before.latitude != null && emptied) {
      patch.clearCoordinates = true;
    } else if (
      latitude !== null &&
      longitude !== null &&
      (latitude !== before.latitude || longitude !== before.longitude)
    ) {
      patch.latitude = latitude;
      patch.longitude = longitude;
    }

    const amenities = cleanList(form.amenities);
    if (!sameList(amenities, before.amenities)) patch.amenities = amenities;

    const tips = cleanList(form.tips);
    if (!sameList(tips, before.tips)) patch.tips = tips;

    const steps = form.steps
      .filter((step) => step.instruction.trim())
      .map((step) => ({ instruction: step.instruction.trim(), subtext: step.subtext.trim() }));
    if (!sameSteps(steps, before.steps.map((s) => ({ instruction: s.instruction, subtext: s.subtext })))) {
      patch.steps = steps;
    }

    return patch;
  }

  // ==========================================================================
  // CALLS
  // ==========================================================================

  /** Every space, unfiltered by audience — the console's list. */
  static async list() {
    const spaces = this.unwrap(
      await api.GET('/api/admin/minbar/prayer-spaces', {}),
      'Failed to load prayer spaces'
    );
    return (Array.isArray(spaces) ? spaces : []).map((s) => this.fromApi(s));
  }

  static async get(id) {
    return this.fromApi(
      this.unwrap(
        await api.GET('/api/admin/minbar/prayer-spaces/{id}', { params: { path: { id } } }),
        'Failed to load prayer space'
      )
    );
  }

  /** @param {ReturnType<typeof PrayerSpaceService.emptyForm>} form */
  static async create(form) {
    return this.fromApi(
      this.unwrap(
        await api.POST('/api/admin/minbar/prayer-spaces', { body: this.toCreateBody(form) }),
        'Failed to create prayer space'
      )
    );
  }

  /** `patch` comes from `changes`; passing a full record would defeat the point. */
  static async update(id, patch) {
    return this.fromApi(
      this.unwrap(
        await api.PATCH('/api/admin/minbar/prayer-spaces/{id}', {
          params: { path: { id } },
          body: patch,
        }),
        'Failed to update prayer space'
      )
    );
  }

  /** Deletes the space and its direction steps with it. */
  static async remove(id) {
    return this.unwrap(
      await api.DELETE('/api/admin/minbar/prayer-spaces/{id}', { params: { path: { id } } }),
      'Failed to delete prayer space'
    );
  }
}

export default PrayerSpaceService;
