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

/** Layout grouping the board uses to place a frame. */
export const FRAME_SLOTS = {
  PRIMARY: { label: 'Primary', description: 'Main carousel area' },
  TICKER: { label: 'Ticker', description: 'Bottom scroller' },
  SIDEBAR: { label: 'Sidebar', description: 'Persistent side panel' },
  OVERLAY: { label: 'Overlay', description: 'Interrupts the carousel' }
};

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
 * @property {string} socialUrl - destination for the closing slide's QR code
 */
export const DEVICE_CONFIG_FIELDS = [
  'location',
  'darkModeAfterIsha',
  'enableScrollingMessage',
  'scrollingMessages',
  'socialUrl'
];

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
  // Empty by default: the board falls back to its built-in Instagram link, and
  // an operator sets this per device only when it should point elsewhere.
  socialUrl: ''
};

/**
 * Strip anything the backend's UpdateBoardConfigRequest won't accept, and the
 * ticker fields on top of that — those belong to `toTickerPatch`.
 */
export function toDeviceConfigPatch(config) {
  if (!config) return {};
  return DEVICE_CONFIG_FIELDS.reduce((patch, field) => {
    if (TICKER_FIELDS.includes(field)) return patch;
    if (config[field] !== undefined) patch[field] = config[field];
    return patch;
  }, {});
}

/** The ticker half of a config, for the ticker endpoint's UpdateTickerRequest. */
export function toTickerPatch(config) {
  if (!config) return {};
  return TICKER_FIELDS.reduce((patch, field) => {
    if (config[field] !== undefined) patch[field] = config[field];
    return patch;
  }, {});
}
