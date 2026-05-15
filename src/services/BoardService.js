import API_CONFIG from '../config/api';

const BOARD_BASE = `${API_CONFIG.BASE_URL}/api/admin/board`;

const VALID_QUOTE_KINDS = new Set(['VERSE', 'HADITH']);

/**
 * BoardService - Musallah Board admin API client.
 *
 * Frontend consumes backend config shapes directly. The only transforms this layer performs:
 *   - boardLocation: 'brothers' | 'sisters' <-> 'BROTHERS_MUSALLAH' | 'SISTERS_MUSALLAH'
 *   - audience: 'brothers' | 'sisters' | 'both' <-> 'BROTHERS' | 'SISTERS' | 'BOTH'
 *   - poster.duration: ms (frontend) <-> seconds (backend)
 */
class BoardService {

  // ============================================================================
  // ENUM TRANSFORMATIONS
  // ============================================================================

  static toBoardLocationEnum(location) {
    return location === 'brothers' ? 'BROTHERS_MUSALLAH' : 'SISTERS_MUSALLAH';
  }

  static fromBoardLocationEnum(enumValue) {
    return enumValue === 'BROTHERS_MUSALLAH' ? 'brothers' : 'sisters';
  }

  static toAudienceEnum(audience) {
    return (audience || 'both').toUpperCase();
  }

  static fromAudienceEnum(enumValue) {
    return (enumValue || 'BOTH').toLowerCase();
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

  // ============================================================================
  // CONFIG SHAPE
  // ============================================================================

  static fromBackendConfig(config) {
    if (!config) return null;
    return {
      ...config,
      boardLocation: this.fromBoardLocationEnum(config.boardLocation)
    };
  }

  /**
   * Normalize a quote from a possibly-legacy shape.
   * Legacy data may have separate `verse`/`hadith` fields; we accept those for read
   * but always write canonical IslamicQuote ({ kind, arabic, ... }).
   */
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
    // Backend may emit "13:30:00"; trim seconds.
    let prayerTime = prayer.prayerTime || prayer.time || '13:30';
    if (/^\d{2}:\d{2}:\d{2}$/.test(prayerTime)) prayerTime = prayerTime.slice(0, 5);
    return {
      prayerTime,
      khatib: prayer.khatib || '',
      room: prayer.room || prayer.location || ''
    };
  }

  static fromBackendWeeklyContent(item) {
    if (!item || !item.weekId) return null;

    // Quotes: prefer the canonical `quotes` array; fall back to legacy verse/hadith fields.
    let quotes = [];
    if (Array.isArray(item.quotes)) {
      quotes = item.quotes.map(q => this.normalizeQuote(q)).filter(Boolean);
    } else {
      if (item.verse) quotes.push(this.normalizeQuote(item.verse, 'VERSE'));
      if (item.hadith) quotes.push(this.normalizeQuote(item.hadith, 'HADITH'));
      quotes = quotes.filter(Boolean);
    }

    // Jummah prayers: list under jummahPrayers (canonical) or jummahPrayer (legacy).
    const rawPrayers = Array.isArray(item.jummahPrayers)
      ? item.jummahPrayers
      : Array.isArray(item.jummahPrayer)
        ? item.jummahPrayer
        : item.jummahPrayer
          ? [item.jummahPrayer]
          : [];
    const jummahPrayer = rawPrayers
      .map(p => this.normalizeJummahPrayer(p))
      .filter(Boolean);

    return {
      year: item.weekId.year,
      weekNumber: item.weekId.weekNumber,
      quotes,
      jummahPrayers: jummahPrayer
    };
  }

  // ============================================================================
  // BOARD CONFIGURATION
  // ============================================================================

  static async getAllConfigs() {
    const response = await fetch(`${BOARD_BASE}/configs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch board configs');
    const configs = await response.json();
    return configs.map(c => this.fromBackendConfig(c));
  }

  static async getConfig(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch config for ${boardLocation}`);
    return this.fromBackendConfig(await response.json());
  }

  static async saveConfig(boardLocation, config) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const body = { ...config, boardLocation: enumLocation };

    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save board config');
    }
    return this.fromBackendConfig(await response.json());
  }

  static async updateConfig(boardLocation, updates) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const body = { ...updates };
    delete body.boardLocation;

    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update board config');
    }
    return this.fromBackendConfig(await response.json());
  }

  // ============================================================================
  // WEEKLY CONTENT
  // ============================================================================

  static async getAllWeeklyContent() {
    const response = await fetch(`${BOARD_BASE}/weekly-content`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch weekly content');
    const items = await response.json();
    return items.map(i => this.fromBackendWeeklyContent(i)).filter(Boolean);
  }

  static async getWeeklyContentByYear(year) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/year/${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch weekly content for year ${year}`);
    const items = await response.json();
    return items.map(i => this.fromBackendWeeklyContent(i)).filter(Boolean);
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
   * Upsert one week's content. Body is a WeeklyContentRequest:
   *   { quotes?: IslamicQuote[], jummahPrayers?: JummahPrayer[] }
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

    const body = { quotes, jummahPrayers };

    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save weekly content');
    }
    return this.fromBackendWeeklyContent(await response.json());
  }

  static async deleteWeeklyContent(year, weekNumber) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete weekly content');
    }
    // 204 No Content is valid; only parse if there's a body
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  }

  // ============================================================================
  // POSTERS
  // ============================================================================

  static fromBackendPoster(poster) {
    return {
      ...poster,
      imageUrl: poster.imageUrl || poster.image || null,
      audience: this.fromAudienceEnum(poster.audience),
      duration: (poster.duration || 0) * 1000
    };
  }

  static async getAllPosters() {
    const response = await fetch(`${BOARD_BASE}/posters`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch posters');
    const posters = await response.json();
    return posters.map(p => this.fromBackendPoster(p));
  }

  static async getPostersByBoard(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/posters?board=${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch posters for ${boardLocation}`);
    const posters = await response.json();
    return posters.map(p => this.fromBackendPoster(p));
  }

  static async getPoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch poster');
    return this.fromBackendPoster(await response.json());
  }

  static async createPoster(posterData) {
    const formData = new FormData();
    formData.append('title', posterData.title);
    formData.append('duration', Math.floor(posterData.duration / 1000));
    formData.append('startDate', posterData.startDate);
    formData.append('endDate', posterData.endDate);
    formData.append('audience', this.toAudienceEnum(posterData.audience));
    formData.append('image', posterData.imageFile);

    const response = await fetch(`${BOARD_BASE}/posters`, {
      method: 'POST',
      headers: this.getMultipartAuthHeaders(),
      body: formData
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create poster');
    }
    return this.fromBackendPoster(await response.json());
  }

  static async updatePoster(posterId, updates) {
    const body = { ...updates };
    if (updates.duration !== undefined) body.duration = Math.floor(updates.duration / 1000);
    if (updates.audience !== undefined) body.audience = this.toAudienceEnum(updates.audience);
    // imageUrl is a derived read field; don't send it back
    delete body.imageUrl;
    delete body.image;

    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update poster');
    }
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
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update poster image');
    }
    return this.fromBackendPoster(await response.json());
  }

  static async deletePoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete poster');
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  static fromBackendEvent(event) {
    const startEpochMs = event.startEpochMs ?? event.startTimestamp;
    const endEpochMs = event.endEpochMs ?? event.endTimestamp;
    return {
      ...event,
      startEpochMs,
      endEpochMs,
      audience: this.fromAudienceEnum(event.audience)
    };
  }

  static async getAllEvents() {
    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    const events = await response.json();
    return events.map(e => this.fromBackendEvent(e));
  }

  static async getEventsByBoard(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/events?board=${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch events for ${boardLocation}`);
    const events = await response.json();
    return events.map(e => this.fromBackendEvent(e));
  }

  static async getEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch event');
    return this.fromBackendEvent(await response.json());
  }

  static async createEvent(eventData) {
    const body = {
      ...eventData,
      startEpochMs: eventData.startEpochMs ?? eventData.startTimestamp,
      endEpochMs: eventData.endEpochMs ?? eventData.endTimestamp,
      audience: this.toAudienceEnum(eventData.audience)
    };
    delete body.startTimestamp;
    delete body.endTimestamp;

    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create event');
    }
    return this.fromBackendEvent(await response.json());
  }

  static async updateEvent(eventId, updates) {
    const body = { ...updates };
    if (updates.startEpochMs !== undefined || updates.startTimestamp !== undefined) {
      body.startEpochMs = updates.startEpochMs ?? updates.startTimestamp;
    }
    if (updates.endEpochMs !== undefined || updates.endTimestamp !== undefined) {
      body.endEpochMs = updates.endEpochMs ?? updates.endTimestamp;
    }
    if (updates.audience !== undefined) body.audience = this.toAudienceEnum(updates.audience);
    delete body.startTimestamp;
    delete body.endTimestamp;

    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update event');
    }
    return this.fromBackendEvent(await response.json());
  }

  static async deleteEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete event');
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
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
