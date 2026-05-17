import API_CONFIG from '../config/api';

const BOARD_BASE = `${API_CONFIG.BASE_URL}/api/admin/board`;

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

  /** Audience the backend expects on writes: uppercase (BROTHERS|SISTERS|BOTH). */
  static toApiAudience(audience) {
    return this.fromApiAudience(audience).toUpperCase();
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

  static getAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...API_CONFIG.HEADERS
    };
  }

  static getMultipartAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      ...API_CONFIG.HEADERS
    };
  }

  /** Parse a response, surfacing backend error messages. */
  static async parseError(response, fallback) {
    const error = await response.json().catch(() => ({}));
    return new Error(error.message || error.error || fallback);
  }

  /** DELETE endpoints return a MessageResponse ({ message }); be lenient. */
  static async readMessage(response, fallback) {
    if (!response.ok) throw await this.parseError(response, fallback);
    const text = await response.text();
    if (!text) return { message: 'OK' };
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
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
      reference: quote.reference || ''
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
    const response = await fetch(`${BOARD_BASE}/weekly-content`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch weekly content');
    const items = await response.json();
    return (Array.isArray(items) ? items : [])
      .map(i => this.fromBackendWeeklyContent(i))
      .filter(Boolean);
  }

  static async getWeeklyContentByYear(year) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/year/${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch weekly content for year ${year}`);
    const items = await response.json();
    return (Array.isArray(items) ? items : [])
      .map(i => this.fromBackendWeeklyContent(i))
      .filter(Boolean);
  }

  static async getWeeklyContent(year, weekNumber) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch content for week ${weekNumber} of ${year}`);
    return this.fromBackendWeeklyContent(await response.json());
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

    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ quotes, jummahPrayers })
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to save weekly content');
    return this.fromBackendWeeklyContent(await response.json());
  }

  static async deleteWeeklyContent(year, weekNumber) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.readMessage(response, 'Failed to delete weekly content');
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
      audience: this.fromApiAudience(poster.audience)
    };
  }

  static async getAllPosters() {
    const response = await fetch(`${BOARD_BASE}/posters`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch posters');
    const posters = await response.json();
    return (Array.isArray(posters) ? posters : []).map(p => this.fromBackendPoster(p));
  }

  static async getPostersByAudience(audience) {
    const params = new URLSearchParams({ audience: this.toApiAudience(audience) });
    const response = await fetch(`${BOARD_BASE}/posters/by-audience?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch posters');
    const posters = await response.json();
    return (Array.isArray(posters) ? posters : []).map(p => this.fromBackendPoster(p));
  }

  static async getPoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch poster');
    return this.fromBackendPoster(await response.json());
  }

  /**
   * Create a poster. Metadata travels as query params; the image file is the
   * multipart body (field name "image").
   */
  static async createPoster(posterData) {
    const params = new URLSearchParams({
      title: posterData.title,
      duration: String(Math.floor((posterData.duration || 0) / 1000)),
      startTime: this.toIso(posterData.startDate),
      endTime: this.toIso(posterData.endDate),
      audience: this.toApiAudience(posterData.audience)
    });

    const formData = new FormData();
    formData.append('image', posterData.imageFile);

    const response = await fetch(`${BOARD_BASE}/posters?${params}`, {
      method: 'POST',
      headers: this.getMultipartAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to create poster');
    return this.fromBackendPoster(await response.json());
  }

  /** Patch poster metadata (UpdatePosterRequest, JSON). */
  static async updatePoster(posterId, updates) {
    const body = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.duration !== undefined) body.duration = Math.floor(updates.duration / 1000);
    if (updates.startDate !== undefined) body.startTime = this.toIso(updates.startDate);
    if (updates.endDate !== undefined) body.endTime = this.toIso(updates.endDate);
    if (updates.audience !== undefined) body.audience = this.toApiAudience(updates.audience);

    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to update poster');
    return this.fromBackendPoster(await response.json());
  }

  static async updatePosterImage(posterId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${BOARD_BASE}/posters/${posterId}/image`, {
      method: 'PUT',
      headers: this.getMultipartAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to update poster image');
    return this.fromBackendPoster(await response.json());
  }

  static async deletePoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.readMessage(response, 'Failed to delete poster');
  }

  // ============================================================================
  // EVENTS  (BoardEvent: { id, name, description, location,
  //          startTime, endTime, allDay, audience })
  // ============================================================================

  static fromBackendEvent(event) {
    return {
      id: event.id,
      name: event.name || '',
      description: event.description || '',
      location: event.location || '',
      startEpochMs: this.toEpochMs(event.startTime),
      endEpochMs: this.toEpochMs(event.endTime),
      allDay: !!event.allDay,
      audience: this.fromApiAudience(event.audience)
    };
  }

  static async getAllEvents() {
    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    const events = await response.json();
    return (Array.isArray(events) ? events : []).map(e => this.fromBackendEvent(e));
  }

  static async getEventsByAudience(audience) {
    const params = new URLSearchParams({ audience: this.toApiAudience(audience) });
    const response = await fetch(`${BOARD_BASE}/events/by-audience?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    const events = await response.json();
    return (Array.isArray(events) ? events : []).map(e => this.fromBackendEvent(e));
  }

  static async getEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch event');
    return this.fromBackendEvent(await response.json());
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
      audience: this.toApiAudience(eventData.audience)
    };

    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to create event');
    return this.fromBackendEvent(await response.json());
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
    if (updates.audience !== undefined) body.audience = this.toApiAudience(updates.audience);

    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) throw await this.parseError(response, 'Failed to update event');
    return this.fromBackendEvent(await response.json());
  }

  static async deleteEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.readMessage(response, 'Failed to delete event');
  }

  // ============================================================================
  // BOARD REFRESH
  // ============================================================================

  static async refreshBoards() {
    const response = await fetch(`${BOARD_BASE}/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to refresh boards');
  }
}

export default BoardService;
