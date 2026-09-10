import { api } from '../api/client';
import { toQuoteDurationSeconds } from '../models/board';

const VALID_QUOTE_KINDS = new Set(['VERSE', 'HADITH']);
const VALID_AUDIENCES = new Set(['brothers', 'sisters', 'both']);

/**
 * BoardService - Musallah Board admin API client.
 *
 * The UI works in a stable "frontend canonical" shape; this layer translates
 * to/from the backend contract (see /v3/api-docs):
 *   - audience: always lowercase 'brothers' | 'sisters' | 'both'
 *   - events:  UI uses startEpochMs/endEpochMs (ms);
 *              backend returns startTime/endTime (ISO date-time),
 *              create accepts startEpochMs/endEpochMs (int64),
 *              update accepts startTime/endTime (ISO date-time)
 *   - posters: UI uses imageUrl + startDate/endDate (yyyy-mm-dd) + duration (ms);
 *              backend uses image + startTime/endTime (ISO date-time) + duration (seconds)
 *   - weekly content: flat { year, weekNumber, quotes[], jummahPrayers[] }
 *   - socials: duration stays in seconds on both sides (the poster ms/seconds
 *              split is a poster-only wart); `handle` is nullable server-side
 *              and '' in the UI, and PATCHing '' is what clears it
 *
 * Device-keyed board configuration lives in DeviceService — it is not a
 * board-location concept anymore.
 */
class BoardService {

  // ============================================================================
  // VALUE TRANSFORMS
  // ============================================================================

  /** Normalize any audience input to the UI's lowercase form. */
  static fromApiAudience(audience) {
    const a = (audience || 'both').toString().toLowerCase();
    return VALID_AUDIENCES.has(a) ? a : 'both';
  }

  /**
   * Audience the backend expects on writes: lowercase (brothers|sisters|both),
   * matching the enum values openapi.yaml declares.
   *
   * This used to uppercase. Jackson had no enum configuration so it read and
   * wrote name() ("BROTHERS") while springdoc documented toString()
   * ("brothers") -- the server accepted only uppercase while the contract
   * promised lowercase. The enum now serialises lowercase and still reads
   * either case, so the wire format and the contract agree.
   */
  static toApiAudience(audience) {
    return this.fromApiAudience(audience);
  }

  /** ISO date-time string (or null) -> epoch ms (or null). */
  static toEpochMs(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  /** Epoch ms or date(-time) string -> ISO date-time string (or undefined). */
  static toIso(value) {
    if (value == null || value === '') return undefined;
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  // ============================================================================
  // AUTH HEADERS
  // ============================================================================

  /**
   * Unwrap an openapi-fetch result, rethrowing the server's message.
   *
   * This class used to build its own Authorization header and call fetch directly,
   * so an expired access token produced a hard 401 instead of a refresh and retry.
   * The shared client now handles that for every call below.
   *
   * @template T
   * @param {{ data?: T, error?: { message?: string } }} result
   * @param {string} fallback
   * @returns {T}
   */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  /** Serializes a single-file multipart body; the image-replace endpoint expects "image". */
  static imageBodySerializer(body) {
    const formData = new FormData();
    formData.append('image', body.image);
    return formData;
  }

  /**
   * Serializes the whole CreatePosterRequest as multipart/form-data.
   *
   * Each property becomes its own form field so Spring's @ModelAttribute binder
   * can map them onto the DTO. Undefined entries are skipped rather than sent as
   * the string "undefined", which is what a naive loop would produce and what the
   * server would then try to parse as a date or an enum.
   */
  static posterBodySerializer(body) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      formData.append(key, value instanceof File || value instanceof Blob ? value : String(value));
    }
    return formData;
  }

  // ============================================================================
  // QUOTES / JUMMAH NORMALIZATION
  // ============================================================================

  static normalizeQuote(quote, fallbackKind = 'VERSE') {
    if (!quote || typeof quote !== 'object') return null;
    const kind = VALID_QUOTE_KINDS.has(quote.kind) ? quote.kind : fallbackKind;
    return {
      kind,
      arabic: quote.arabic || '',
      transliteration: quote.transliteration || '',
      translation: quote.translation || '',
      reference: quote.reference || '',
      // null is auto, in both directions. The editor's box is '' when empty and
      // QuoteEntry validates @Min(5), so neither '' nor 0 may reach the wire.
      durationSeconds: toQuoteDurationSeconds(quote.durationSeconds)
    };
  }

  static normalizeJummahPrayer(prayer) {
    if (!prayer || typeof prayer !== 'object') return null;
    // Backend may emit "13:30:00"; the UI's <input type="time"> wants "13:30".
    let prayerTime = prayer.prayerTime || prayer.time || '13:30';
    if (/^\d{2}:\d{2}:\d{2}$/.test(prayerTime)) prayerTime = prayerTime.slice(0, 5);
    return {
      prayerTime,
      khatib: prayer.khatib || '',
      room: prayer.room || prayer.location || ''
    };
  }

  // ============================================================================
  // WEEKLY CONTENT  (WeeklyContent: { id, year, weekNumber, quotes, jummahPrayers })
  // ============================================================================

  static fromBackendWeeklyContent(item) {
    if (!item || item.year == null || item.weekNumber == null) return null;
    const quotes = Array.isArray(item.quotes)
      ? item.quotes.map(q => this.normalizeQuote(q)).filter(Boolean)
      : [];
    const jummahPrayers = Array.isArray(item.jummahPrayers)
      ? item.jummahPrayers.map(p => this.normalizeJummahPrayer(p)).filter(Boolean)
      : [];
    return {
      id: item.id,
      year: item.year,
      weekNumber: item.weekNumber,
      quotes,
      jummahPrayers
    };
  }

  static async getAllWeeklyContent() {
    const items = this.unwrap(
      await api.GET('/api/admin/board/weekly-content', {}),
      'Failed to fetch weekly content'
    );
    return (Array.isArray(items) ? items : [])
      .map(i => this.fromBackendWeeklyContent(i))
      .filter(Boolean);
  }

  static async getWeeklyContentByYear(year) {
    const items = this.unwrap(
      await api.GET('/api/admin/board/weekly-content/year/{year}', { params: { path: { year } } }),
      `Failed to fetch weekly content for year ${year}`
    );
    return (Array.isArray(items) ? items : [])
      .map(i => this.fromBackendWeeklyContent(i))
      .filter(Boolean);
  }

  static async getWeeklyContent(year, weekNumber) {
    return this.fromBackendWeeklyContent(this.unwrap(
      await api.GET('/api/admin/board/weekly-content/{year}/{weekNumber}', {
        params: { path: { year, weekNumber } }
      }),
      `Failed to fetch content for week ${weekNumber} of ${year}`
    ));
  }

  /**
   * Upsert one week's content.
   * Body is a WeeklyContentRequest: { quotes: QuoteEntry[], jummahPrayers: JummahSlot[] }.
   */
  static async saveWeeklyContent(content) {
    const { year, weekNumber } = content;
    if (!year || !weekNumber) {
      throw new Error('year and weekNumber are required to save weekly content');
    }

    const quotes = Array.isArray(content.quotes)
      ? content.quotes.map(q => this.normalizeQuote(q)).filter(q => q && (q.arabic || q.translation))
      : [];

    const jummahPrayers = Array.isArray(content.jummahPrayers)
      ? content.jummahPrayers.map(p => this.normalizeJummahPrayer(p)).filter(Boolean)
      : [];

    return this.fromBackendWeeklyContent(this.unwrap(
      await api.PUT('/api/admin/board/weekly-content/{year}/{weekNumber}', {
        params: { path: { year, weekNumber } },
        body: { quotes, jummahPrayers }
      }),
      'Failed to save weekly content'
    ));
  }

  static async deleteWeeklyContent(year, weekNumber) {
    return this.unwrap(
      await api.DELETE('/api/admin/board/weekly-content/{year}/{weekNumber}', {
        params: { path: { year, weekNumber } }
      }),
      'Failed to delete weekly content'
    );
  }

  // ============================================================================
  // POSTERS  (Poster: { id, title, image, duration[s], startTime, endTime, audience })
  // ============================================================================

  static fromBackendPoster(poster) {
    return {
      id: poster.id,
      title: poster.title,
      imageUrl: poster.image || null,
      // UI keeps duration in ms; backend stores seconds.
      duration: (poster.duration || 0) * 1000,
      // UI's <input type="date"> wants yyyy-mm-dd; backend sends ISO date-time.
      startDate: poster.startTime ? poster.startTime.slice(0, 10) : '',
      endDate: poster.endTime ? poster.endTime.slice(0, 10) : '',
      audience: this.fromApiAudience(poster.audience),
      // Optional; when set the board pairs the poster with a QR code.
      signupUrl: poster.signupUrl || ''
    };
  }

  static async getAllPosters() {
    const posters = this.unwrap(
      await api.GET('/api/admin/board/posters', {}),
      'Failed to fetch posters'
    );
    return (Array.isArray(posters) ? posters : []).map(p => this.fromBackendPoster(p));
  }

  static async getPostersByAudience(audience) {
    const posters = this.unwrap(
      await api.GET('/api/admin/board/posters/by-audience', {
        params: { query: { audience: this.toApiAudience(audience) } }
      }),
      'Failed to fetch posters'
    );
    return (Array.isArray(posters) ? posters : []).map(p => this.fromBackendPoster(p));
  }

  static async getPoster(posterId) {
    return this.fromBackendPoster(this.unwrap(
      await api.GET('/api/admin/board/posters/{posterId}', { params: { path: { posterId } } }),
      'Failed to fetch poster'
    ));
  }

  /**
   * Create a poster.
   *
   * Everything — metadata and image alike — is one multipart/form-data body,
   * bound server-side onto CreatePosterRequest. Metadata used to ride in the
   * query string with only the file in the body.
   */
  static async createPoster(posterData) {
    return this.fromBackendPoster(this.unwrap(
      await api.POST('/api/admin/board/posters', {
        body: {
          title: posterData.title,
          duration: Math.floor((posterData.duration || 0) / 1000),
          startTime: this.toIso(posterData.startDate),
          endTime: this.toIso(posterData.endDate),
          audience: this.toApiAudience(posterData.audience),
          imageFile: posterData.imageFile,
          // Omitted when blank so the server stores null rather than "".
          ...(posterData.signupUrl?.trim()
            ? { signupUrl: posterData.signupUrl.trim() }
            : {})
        },
        bodySerializer: this.posterBodySerializer
      }),
      'Failed to create poster'
    ));
  }

  /** Patch poster metadata (UpdatePosterRequest, JSON). */
  static async updatePoster(posterId, updates) {
    const body = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.duration !== undefined) body.duration = Math.floor(updates.duration / 1000);
    if (updates.startDate !== undefined) body.startTime = this.toIso(updates.startDate);
    if (updates.endDate !== undefined) body.endTime = this.toIso(updates.endDate);
    if (updates.audience !== undefined) body.audience = this.toApiAudience(updates.audience);
    // Sent as '' rather than omitted when cleared: the server treats an empty
    // string as "remove the link", where undefined would leave it unchanged.
    if (updates.signupUrl !== undefined) body.signupUrl = updates.signupUrl.trim();

    return this.fromBackendPoster(this.unwrap(
      await api.PATCH('/api/admin/board/posters/{posterId}', {
        params: { path: { posterId } },
        body
      }),
      'Failed to update poster'
    ));
  }

  static async updatePosterImage(posterId, imageFile) {
    return this.fromBackendPoster(this.unwrap(
      await api.PUT('/api/admin/board/posters/{posterId}/image', {
        params: { path: { posterId } },
        body: { image: imageFile },
        bodySerializer: this.imageBodySerializer
      }),
      'Failed to update poster image'
    ));
  }

  static async deletePoster(posterId) {
    return this.unwrap(
      await api.DELETE('/api/admin/board/posters/{posterId}', { params: { path: { posterId } } }),
      'Failed to delete poster'
    );
  }

  // ============================================================================
  // PROMOTED SOCIALS
  // (PromotableSocialMedia: { id, name, duration[s], audience, type, url,
  //                           headerText, heroText, handle, footerText })
  // ============================================================================

  /**
   * Normalize one promoted social.
   *
   * Unlike posters, duration stays in seconds all the way to the input box.
   * The backend field is seconds, the board reads seconds, and the poster
   * seconds/ms dance exists only because PostersEditor predates the contract —
   * there is no reason to reproduce it here.
   *
   * `handle` is nullable: WhatsApp invites have no handle. It normalizes to ''
   * so the form has a controlled value, and `updateSocial` sends '' back as an
   * explicit clear.
   */
  static fromBackendSocial(social) {
    return {
      id: social.id,
      name: social.name || '',
      duration: social.duration ?? 0,
      audience: this.fromApiAudience(social.audience),
      type: social.type || 'other',
      url: social.url || '',
      headerText: social.headerText || '',
      heroText: social.heroText || '',
      // Nullable server-side; '' in the UI, and '' is also how it gets cleared.
      handle: social.handle || '',
      footerText: social.footerText || ''
    };
  }

  static async getAllSocials() {
    const socials = this.unwrap(
      await api.GET('/api/admin/board/socials', {}),
      'Failed to fetch promoted socials'
    );
    return (Array.isArray(socials) ? socials : []).map(s => this.fromBackendSocial(s));
  }

  static async getSocialsByAudience(audience) {
    const socials = this.unwrap(
      await api.GET('/api/admin/board/socials/by-audience', {
        params: { query: { audience: this.toApiAudience(audience) } }
      }),
      'Failed to fetch promoted socials'
    );
    return (Array.isArray(socials) ? socials : []).map(s => this.fromBackendSocial(s));
  }

  static async getSocial(socialId) {
    return this.fromBackendSocial(this.unwrap(
      await api.GET('/api/admin/board/socials/{socialId}', { params: { path: { socialId } } }),
      'Failed to fetch promoted social'
    ));
  }

  /** Create a promoted social (CreatePromotableSocialMediaRequest, JSON). */
  static async createSocial(social) {
    return this.fromBackendSocial(this.unwrap(
      await api.POST('/api/admin/board/socials', {
        body: {
          name: social.name?.trim(),
          duration: social.duration,
          audience: this.toApiAudience(social.audience),
          type: social.type,
          url: social.url?.trim(),
          headerText: social.headerText ?? '',
          heroText: social.heroText ?? '',
          footerText: social.footerText ?? '',
          // Omitted rather than sent blank so a handle-less platform stores
          // null instead of the empty string.
          ...(social.handle?.trim() ? { handle: social.handle.trim() } : {})
        }
      }),
      'Failed to create promoted social'
    ));
  }

  /**
   * Patch a promoted social (UpdatePromotableSocialMediaRequest, JSON).
   *
   * Omitted fields are left alone, so only what the caller passed is sent.
   * `handle` is the exception worth naming: '' means *clear the handle*, where
   * omitting it means "leave it as it was". The edit form always passes the
   * field, which is what makes clearing a handle possible at all.
   */
  static async updateSocial(socialId, updates) {
    const body = {};
    if (updates.name !== undefined) body.name = updates.name.trim();
    if (updates.duration !== undefined) body.duration = updates.duration;
    if (updates.audience !== undefined) body.audience = this.toApiAudience(updates.audience);
    if (updates.type !== undefined) body.type = updates.type;
    if (updates.url !== undefined) body.url = updates.url.trim();
    if (updates.headerText !== undefined) body.headerText = updates.headerText;
    if (updates.heroText !== undefined) body.heroText = updates.heroText;
    if (updates.footerText !== undefined) body.footerText = updates.footerText;
    if (updates.handle !== undefined) body.handle = updates.handle.trim();

    return this.fromBackendSocial(this.unwrap(
      await api.PATCH('/api/admin/board/socials/{socialId}', {
        params: { path: { socialId } },
        body
      }),
      'Failed to update promoted social'
    ));
  }

  static async deleteSocial(socialId) {
    return this.unwrap(
      await api.DELETE('/api/admin/board/socials/{socialId}', { params: { path: { socialId } } }),
      'Failed to delete promoted social'
    );
  }

  // ============================================================================
  // EVENTS  (BoardEvent: { id, name, description, location, startTime, endTime,
  //          allDay, allowUploads, audience, event })
  // ============================================================================

  /**
   * `event` on the wire is the linked tCketManage event, not the board event
   * itself — a genuinely confusing name to carry into the UI, so it lands here
   * as `ticketEvent`. Null means the board event sells no tickets, which is the
   * normal case; see linkTicketEvent below.
   */
  static fromBackendEvent(event) {
    return {
      id: event.id,
      name: event.name || '',
      description: event.description || '',
      location: event.location || '',
      startEpochMs: this.toEpochMs(event.startTime),
      endEpochMs: this.toEpochMs(event.endTime),
      allDay: !!event.allDay,
      allowUploads: !!event.allowUploads,
      audience: this.fromApiAudience(event.audience),
      ticketEvent: event.event
        ? {
            id: event.event.id,
            name: event.event.name || '',
            location: event.event.location || '',
            description: event.event.description || '',
            timeEpochMs: this.toEpochMs(event.event.time)
          }
        : null
    };
  }

  static async getAllEvents() {
    const events = this.unwrap(
      await api.GET('/api/admin/board/events', {}),
      'Failed to fetch events'
    );
    return (Array.isArray(events) ? events : []).map(e => this.fromBackendEvent(e));
  }

  static async getEventsByAudience(audience) {
    const events = this.unwrap(
      await api.GET('/api/admin/board/events/by-audience', {
        params: { query: { audience: this.toApiAudience(audience) } }
      }),
      'Failed to fetch events'
    );
    return (Array.isArray(events) ? events : []).map(e => this.fromBackendEvent(e));
  }

  static async getEvent(eventId) {
    return this.fromBackendEvent(this.unwrap(
      await api.GET('/api/admin/board/events/{eventId}', { params: { path: { eventId } } }),
      'Failed to fetch event'
    ));
  }

  /** Create an event (CreateCalendarEventRequest: startEpochMs/endEpochMs, int64). */
  static async createEvent(eventData) {
    const body = {
      name: eventData.name,
      description: eventData.description || '',
      location: eventData.location || '',
      startEpochMs: this.toEpochMs(eventData.startEpochMs),
      endEpochMs: this.toEpochMs(eventData.endEpochMs),
      allDay: !!eventData.allDay,
      allowUploads: !!eventData.allowUploads,
      audience: this.toApiAudience(eventData.audience)
    };

    return this.fromBackendEvent(this.unwrap(
      await api.POST('/api/admin/board/events', { body }),
      'Failed to create event'
    ));
  }

  /** Patch an event (UpdateCalendarEventRequest: startTime/endTime, ISO date-time). */
  static async updateEvent(eventId, updates) {
    const body = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.location !== undefined) body.location = updates.location;
    if (updates.startEpochMs !== undefined) body.startTime = this.toIso(updates.startEpochMs);
    if (updates.endEpochMs !== undefined) body.endTime = this.toIso(updates.endEpochMs);
    if (updates.allDay !== undefined) body.allDay = !!updates.allDay;
    if (updates.allowUploads !== undefined) body.allowUploads = !!updates.allowUploads;
    if (updates.audience !== undefined) body.audience = this.toApiAudience(updates.audience);

    return this.fromBackendEvent(this.unwrap(
      await api.PATCH('/api/admin/board/events/{eventId}', {
        params: { path: { eventId } },
        body
      }),
      'Failed to update event'
    ));
  }

  static async deleteEvent(eventId) {
    return this.unwrap(
      await api.DELETE('/api/admin/board/events/{eventId}', { params: { path: { eventId } } }),
      'Failed to delete event'
    );
  }

  /**
   * Point a board event at a tCketManage event, so the board can advertise that
   * tickets exist and /api/minbar/events can serve their availability.
   *
   * The link is a property of the board event and lives behind `board:event:write`,
   * but choosing which ticketed event to attach means reading the tCket event list,
   * which needs `tcket:manage` — see TicketingService. Both are checked at the call
   * site; the server enforces each on its own endpoint.
   *
   * Returns the updated BoardEvent, so the caller can replace its row rather than refetch.
   */
  static async linkTicketEvent(eventId, tcketEventId) {
    return this.fromBackendEvent(this.unwrap(
      await api.PUT('/api/admin/board/events/{eventId}/ticket-event/{tcketEventId}', {
        params: { path: { eventId, tcketEventId } }
      }),
      'Failed to link ticketed event'
    ));
  }

  /** Detach the tCketManage event. The ticketed event itself is untouched. */
  static async unlinkTicketEvent(eventId) {
    return this.fromBackendEvent(this.unwrap(
      await api.DELETE('/api/admin/board/events/{eventId}/ticket-event', {
        params: { path: { eventId } }
      }),
      'Failed to unlink ticketed event'
    ));
  }

  // ============================================================================
  // ASSEMBLED PAYLOAD
  // ============================================================================

  /**
   * The exact payload a given board fetches: `{ deviceConfig, frames, weather }`.
   *
   * This is the same endpoint the kiosk hits, so the admin preview shows what
   * is really on screen rather than the UI's guess at it. Frames arrive already
   * filtered by the device's audience and ordered by the assembler — do not
   * re-sort or re-filter them here.
   */
  static async getDevicePayload(deviceId) {
    return this.unwrap(
      await api.GET('/api/musallah/payload', { params: { query: { deviceId } } }),
      'Failed to fetch board payload'
    );
  }

  // ============================================================================
  // BOARD REFRESH
  // ============================================================================

  static async refreshBoards() {
    this.unwrap(await api.POST('/api/admin/board/refresh', {}), 'Failed to refresh boards');
  }
}

export default BoardService;
