/**
 * MusallahBoard contract constants.
 *
 * Mirrors the backend enums and DTOs so the admin UI stops inventing its own
 * vocabulary. When the backend changes, this file changes with it — nothing
 * else in the UI should hardcode a frame type or a calculation method.
 *
 * Backend sources:
 *   model/board/frames/FrameType.java
 *   model/board/frames/FrameSlot.java
 *   model/board/frames/FrameDefinition.java
 *   model/board/Audience.java
 *   model/board/CalculationMethod.java
 *   model/board/embedded/DeviceConfig.java
 *   dto/board/response/MusallahBoardPayload.java
 */

// ============================================================================
// FRAMES
// ============================================================================

/**
 * Frame types the assembler can emit, keyed by the enum name Jackson actually
 * puts on the wire.
 *
 * `FrameType` overrides `toString()` to return a lowercase snake_case form, and
 * that is what springdoc wrote into openapi.yaml — but Jackson serializes enums
 * with `name()` unless `@JsonValue` or `WRITE_ENUMS_USING_TO_STRING` says
 * otherwise, and neither is set. So the documented value is `poster` while the
 * response body says `POSTER`. Keying this map on the lowercase form is what
 * made every frame render as an unlabelled grey box.
 *
 * `normalizeFrameType` accepts both, so whichever side of that contract gets
 * fixed, this keeps working. `FrameSlot` has no custom `toString()` and so was
 * never affected — which is why the slot chip resolved while the type did not.
 *
 * @typedef {'POSTER'|'EVENT_LIST'|'DAILY_SCHEDULE'|'NEXT_PRAYER'|'JUMMAH'|'ISLAMIC_QUOTE'} FrameType
 */
export const FRAME_TYPES = {
  POSTER: {
    label: 'Poster',
    description: 'A single uploaded poster image',
    source: 'Posters tab'
  },
  EVENT_LIST: {
    label: 'Upcoming Events',
    description: 'Events ahead of today, for this board audience',
    source: 'Events tab'
  },
  DAILY_SCHEDULE: {
    label: "Today's Schedule",
    description: "Events falling inside the device's current day",
    source: 'Events tab'
  },
  NEXT_PRAYER: {
    label: 'Next Prayer',
    description: 'Computed on the board itself from deviceConfig.location',
    source: 'Device config'
  },
  JUMMAH: {
    label: 'Jummah',
    description: 'Khutbah slots for the current week',
    source: 'Weekly tab'
  },
  ISLAMIC_QUOTE: {
    label: 'Verse & Hadith',
    description: "The week's verse and hadith",
    source: 'Weekly tab'
  }
};

/**
 * Both spellings of a frame type collapse to the enum name. The lowercase wire
 * form is exactly the snake_case of the name, so upcasing is the whole mapping.
 */
export function normalizeFrameType(frameType) {
  return frameType ? String(frameType).toUpperCase() : '';
}


/** Human label for a frame type, tolerating anything the backend adds later. */
export function frameTypeLabel(frameType) {
  const key = normalizeFrameType(frameType);
  // An unknown type still reads better title-cased than as a raw SCREAMING_CASE
  // token, and the assembler gaining a frame type is not a reason to show one.
  return FRAME_TYPES[key]?.label ?? titleCase(key) ?? 'Unknown frame';
}

function titleCase(value) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `durationInSeconds: null` means the board picks the duration itself. */
export function frameDurationLabel(durationInSeconds) {
  return durationInSeconds == null ? 'Auto' : `${durationInSeconds}s`;
}

// ============================================================================
// AUDIENCE
// ============================================================================

/**
 * Which musallah a device serves, and who a poster/event targets.
 * The UI works in lowercase throughout; BoardService uppercases on write.
 *
 * @typedef {'brothers'|'sisters'|'both'} Audience
 */
export const AUDIENCES = ['brothers', 'sisters', 'both'];

export const AUDIENCE_LABELS = {
  brothers: 'Brothers',
  sisters: 'Sisters',
  both: 'Both'
};

// ============================================================================
// PROMOTED SOCIALS
// ============================================================================

/**
 * The platforms a `PromotableSocialMedia` can carry, in the order the enum
 * declares them. Values are lowercase on the wire — unlike `FrameType`, this
 * enum is documented and serialized the same way, so there is no dual spelling
 * to normalize.
 *
 * `handled: false` marks a platform with no public handle to show. WhatsApp
 * community invites are a link and nothing else, so the frame's handle line is
 * simply absent — that is a real state, not a field an operator forgot.
 *
 * Backend source: model/board/PromotableSocialMedia.java
 *
 * @typedef {'instagram'|'youtube'|'tiktok'|'whatsapp'|'other'} SocialType
 */
export const SOCIAL_PLATFORMS = [
  {
    value: 'instagram',
    label: 'Instagram',
    handled: true,
    urlHint: 'https://instagram.com/utmmsa',
    handleHint: '@utmmsa'
  },
  {
    value: 'youtube',
    label: 'YouTube',
    handled: true,
    urlHint: 'https://youtube.com/@utmmsa',
    handleHint: '@utmmsa'
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    handled: true,
    urlHint: 'https://tiktok.com/@utmmsa',
    handleHint: '@utmmsa'
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    handled: false,
    urlHint: 'https://chat.whatsapp.com/...',
    handleHint: ''
  },
  {
    value: 'other',
    label: 'Other',
    handled: true,
    urlHint: 'https://linktr.ee/utmmsa',
    handleHint: '@utmmsa'
  }
];

export const SOCIAL_TYPES = SOCIAL_PLATFORMS.map(p => p.value);

/** Platform metadata, falling back to `other` for anything the enum gains later. */
export function socialPlatform(type) {
  return SOCIAL_PLATFORMS.find(p => p.value === type)
    ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
}

/** Human label for a platform, tolerating a value this file has not caught up to. */
export function socialTypeLabel(type) {
  const known = SOCIAL_PLATFORMS.find(p => p.value === type);
  return known?.label ?? titleCase(type) ?? 'Other';
}

/** What a brand-new promoted social starts as, before the operator types. */
export const DEFAULT_SOCIAL_DURATION_SECONDS = 15;

// ============================================================================
// PRAYER TIME CALCULATION
// ============================================================================

/** CalculationMethod enum names, in the backend's declared order. */
export const CALCULATION_METHODS = [
  { value: 'KARACHI', label: 'University of Islamic Sciences, Karachi' },
  { value: 'ISNA', label: 'Islamic Society of North America (ISNA)' },
  { value: 'MWL', label: 'Muslim World League' },
  { value: 'MAKKAH', label: 'Umm Al-Qura University, Makkah' },
  { value: 'EGYPT', label: 'Egyptian General Authority of Survey' },
  { value: 'TEHRAN', label: 'Institute of Geophysics, Tehran' },
  { value: 'GULF', label: 'Gulf Region' },
  { value: 'KUWAIT', label: 'Kuwait' },
  { value: 'QATAR', label: 'Qatar' },
  { value: 'SINGAPORE', label: 'Majlis Ugama Islam Singapura' },
  { value: 'FRANCE', label: 'Union Organization Islamic de France' },
  { value: 'TURKEY', label: 'Diyanet Isleri Baskanligi, Turkey' },
  { value: 'RUSSIA', label: 'Spiritual Administration of Muslims of Russia' },
  { value: 'DUBAI', label: 'Dubai' }
];

export const TIMEZONES = [
  'America/Toronto', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'America/Vancouver',
  'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns'
];

// ============================================================================
// DEVICE CONFIG
// ============================================================================

/**
 * Everything DeviceConfig holds — nothing more. Sending unknown keys to
 * PATCH /api/admin/board/configs/{deviceId} is silently dropped, which is
 * how the old poster-cycle and refresh-delay fields survived in the UI long
 * after the backend stopped having them.
 *
 * @typedef {Object} DeviceConfig
 * @property {Location} location
 * @property {boolean} darkModeAfterIsha
 * @property {boolean} enableScrollingMessage
 * @property {string[]} scrollingMessages
 * @property {number|null} agendaDurationSeconds - null means the board picks it
 * @property {number} nextPrayerDurationSeconds - never null server-side
 */
export const DEVICE_CONFIG_FIELDS = [
  'location',
  'darkModeAfterIsha',
  'enableScrollingMessage',
  'scrollingMessages',
  'agendaDurationSeconds',
  'nextPrayerDurationSeconds'
];

// ---------------------------------------------------------------------------
// SLIDE DURATIONS
// ---------------------------------------------------------------------------

/** Bounds UpdateBoardConfigRequest validates, in seconds. */
export const SLIDE_DURATION_MIN_SECONDS = 5;
export const SLIDE_DURATION_MAX_SECONDS = 120;

/**
 * `agendaDurationSeconds: null` on the way in means auto — the board sizes the
 * slide from how many events are on it.
 *
 * On the way out it cannot stay null: PATCH /configs/{deviceId} patches by
 * null-skipping, so a null field means "leave it alone", not "clear it". 0 is
 * the sentinel that puts the field back to auto — the same shape as the empty
 * string that clears a promoted social's `handle`. `toDeviceConfigPatch` does
 * that translation, so the rest of the UI only ever handles null.
 */
export const AGENDA_DURATION_AUTO = 0;

/** What the board actually does when the agenda duration is auto. */
export const AGENDA_AUTO_RANGE_LABEL = 'grows with the number of events, 12-30s';

/** Used when an admin turns auto off and there is no previous number to restore. */
export const DEFAULT_AGENDA_DURATION_SECONDS = 20;
export const DEFAULT_NEXT_PRAYER_DURATION_SECONDS = 12;

function durationError(value) {
  if (value === '' || value === null || value === undefined) {
    return 'Enter a duration in seconds.';
  }
  if (!Number.isInteger(value)) {
    return 'Enter a whole number of seconds.';
  }
  if (value < SLIDE_DURATION_MIN_SECONDS || value > SLIDE_DURATION_MAX_SECONDS) {
    return `Must be between ${SLIDE_DURATION_MIN_SECONDS} and ${SLIDE_DURATION_MAX_SECONDS} seconds.`;
  }
  return '';
}

/**
 * Per-field messages for the two slide durations, keyed by field name; an empty
 * object means the config is safe to PATCH.
 *
 * `undefined` is never an error: it is a field the form has not touched, which
 * `toDeviceConfigPatch` drops. Only a value the admin actually typed — including
 * an emptied input — is checked, so a config loaded from a backend that predates
 * these fields does not light the form up red.
 *
 * @param {DeviceConfig|null} config
 * @returns {Record<string, string>}
 */
export function slideDurationErrors(config) {
  const errors = {};
  if (!config) return errors;

  // null is auto, which is always valid.
  if (config.agendaDurationSeconds !== null && config.agendaDurationSeconds !== undefined) {
    const error = durationError(config.agendaDurationSeconds);
    if (error) errors.agendaDurationSeconds = error;
  }

  if (config.nextPrayerDurationSeconds !== undefined) {
    const error = durationError(config.nextPrayerDurationSeconds);
    if (error) errors.nextPrayerDurationSeconds = error;
  }

  return errors;
}

/**
 * The ticker sub-resource, PATCHed separately at
 * /api/admin/board/configs/{deviceId}/ticker under `board:ticker:write`.
 *
 * UpdateBoardConfigRequest still accepts these — `board:config:write` is the
 * strictly broader grant — but the two cards save through their own endpoints,
 * so the main patch drops them rather than letting a config save silently
 * overwrite ticker copy the user never opened.
 */
export const TICKER_FIELDS = ['enableScrollingMessage', 'scrollingMessages'];

/**
 * @typedef {Object} Location
 * @property {string} city
 * @property {string} country
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} timezone - IANA zone
 * @property {string} method - CalculationMethod enum name
 */

export const DEFAULT_DEVICE_CONFIG = {
  location: {
    city: 'Mississauga',
    country: 'Canada',
    latitude: 43.5890,
    longitude: -79.6441,
    timezone: 'America/Toronto',
    method: 'ISNA'
  },
  darkModeAfterIsha: true,
  enableScrollingMessage: true,
  scrollingMessages: ['Welcome to UTM MSA — follow @utmmsa for updates'],
  // null is auto — the board sizes the agenda slide from its event count.
  agendaDurationSeconds: null,
  nextPrayerDurationSeconds: DEFAULT_NEXT_PRAYER_DURATION_SECONDS
};

/**
 * Strip anything the backend's UpdateBoardConfigRequest won't accept, and the
 * ticker fields on top of that — those belong to `toTickerPatch`.
 */
export function toDeviceConfigPatch(config) {
  if (!config) return {};
  const patch = DEVICE_CONFIG_FIELDS.reduce((acc, field) => {
    if (TICKER_FIELDS.includes(field)) return acc;
    if (config[field] !== undefined) acc[field] = config[field];
    return acc;
  }, {});

  // Auto is null everywhere in the UI, but a null field is skipped by the
  // endpoint rather than cleared, so it travels as the 0 sentinel.
  if (patch.agendaDurationSeconds === null) {
    patch.agendaDurationSeconds = AGENDA_DURATION_AUTO;
  }

  return patch;
}

/** The ticker half of a config, for the ticker endpoint's UpdateTickerRequest. */
export function toTickerPatch(config) {
  if (!config) return {};
  return TICKER_FIELDS.reduce((patch, field) => {
    if (config[field] !== undefined) patch[field] = config[field];
    return patch;
  }, {});
}
