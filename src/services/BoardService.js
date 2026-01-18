import API_CONFIG from '../config/api';

const BOARD_BASE = `${API_CONFIG.BASE_URL}/api/admin/board`;
const DEFAULT_JUMMAH_PRAYER = {
  time: '13:30',
  khatib: '',
  location: 'Main Musallah',
  date: ''
};

/**
 * BoardService - Handles all Musallah Board API interactions
 * Includes data transformation between frontend and backend formats
 */
class BoardService {
  
  // ============================================================================
  // UTILITY FUNCTIONS - Data Transformation
  // ============================================================================

  /**
   * Transform frontend boardLocation to backend enum
   * @param {string} location - 'brothers' or 'sisters'
   * @returns {string} - 'BROTHERS_MUSALLAH' or 'SISTERS_MUSALLAH'
   */
  static toBoardLocationEnum(location) {
    return location === 'brothers' ? 'BROTHERS_MUSALLAH' : 'SISTERS_MUSALLAH';
  }

  /**
   * Transform backend boardLocation enum to frontend format
   * @param {string} enumValue - 'BROTHERS_MUSALLAH' or 'SISTERS_MUSALLAH'
   * @returns {string} - 'brothers' or 'sisters'
   */
  static fromBoardLocationEnum(enumValue) {
    return enumValue === 'BROTHERS_MUSALLAH' ? 'brothers' : 'sisters';
  }

  /**
   * Transform frontend audience to backend enum
   * @param {string} audience - 'brothers', 'sisters', or 'both'
   * @returns {string} - 'BROTHERS', 'SISTERS', or 'BOTH'
   */
  static toAudienceEnum(audience) {
    return audience.toUpperCase();
  }

  /**
   * Transform backend audience enum to frontend format
   * @param {string} enumValue - 'BROTHERS', 'SISTERS', or 'BOTH'
   * @returns {string} - 'brothers', 'sisters', or 'both'
   */
  static fromAudienceEnum(enumValue) {
    return enumValue.toLowerCase();
  }

  /**
   * Normalize Jummah prayer payload to ensure consistent structure
   * @param {Object|null} jummahPrayer
   * @returns {Object} jummahPrayer with defaults filled in
   */
  static normalizeJummahPrayer(jummahPrayer) {
    const source = jummahPrayer || {};
    return {
      time: source.time ?? DEFAULT_JUMMAH_PRAYER.time,
      khatib: source.khatib ?? DEFAULT_JUMMAH_PRAYER.khatib,
      location: source.location ?? DEFAULT_JUMMAH_PRAYER.location,
      date: source.date ?? DEFAULT_JUMMAH_PRAYER.date
    };
  }

  /**
   * Prepare Jummah prayers array for backend payload
   * @param {Object|null} jummahPrayer
   * @returns {Array} Array of backend-ready jummah prayers
   */
  static toBackendJummahPrayers(jummahPrayer) {
    const normalized = this.normalizeJummahPrayer(jummahPrayer);
    const time = (normalized.time || '').trim();
    const khatib = (normalized.khatib || '').trim();
    const location = (normalized.location || '').trim();
    const hasData = time || khatib || location;

    if (!hasData) {
      return [];
    }

    return [{
      prayerTime: time || DEFAULT_JUMMAH_PRAYER.time,
      khatib,
      location: location || DEFAULT_JUMMAH_PRAYER.location
    }];
  }

  /**
   * Convert backend jummah payload (list or single) to frontend shape
   * @param {Object} source - weekly content item with jummahPrayers/jummahPrayer
   * @returns {Object} Frontend jummahPrayer shape with defaults
   */
  static fromBackendJummah(source = {}) {
    const fromList = Array.isArray(source.jummahPrayers) && source.jummahPrayers.length > 0
      ? source.jummahPrayers[0]
      : null;

    const candidate = fromList || source.jummahPrayer || {};

    return this.normalizeJummahPrayer({
      time: candidate.prayerTime || candidate.time,
      khatib: candidate.khatib,
      location: candidate.location,
      date: candidate.date
    });
  }

  /**
   * Get auth headers with JWT token
   */
  static getAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...API_CONFIG.HEADERS
    };
  }

  /**
   * Get auth headers for multipart form data
   */
  static getMultipartAuthHeaders() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      ...API_CONFIG.HEADERS
    };
  }

  // ============================================================================
  // BOARD CONFIGURATION
  // ============================================================================

  /**
   * Get all board configurations
   * @returns {Promise<Array>} Array of board configs
   */
  static async getAllConfigs() {
    const response = await fetch(`${BOARD_BASE}/configs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch board configs');
    }

    const configs = await response.json();
    
    // Transform backend enums to frontend format
    return configs.map(config => ({
      ...config,
      boardLocation: this.fromBoardLocationEnum(config.boardLocation)
    }));
  }

  /**
   * Get specific board configuration
   * @param {string} boardLocation - 'brothers' or 'sisters'
   * @returns {Promise<Object>} Board config
   */
  static async getConfig(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch config for ${boardLocation}`);
    }

    const config = await response.json();
    return {
      ...config,
      boardLocation: this.fromBoardLocationEnum(config.boardLocation)
    };
  }

  /**
   * Create or replace board configuration
   * @param {string} boardLocation - 'brothers' or 'sisters'
   * @param {Object} config - Board configuration
   * @returns {Promise<Object>} Saved config
   */
  static async saveConfig(boardLocation, config) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const backendConfig = {
      ...config,
      boardLocation: enumLocation
    };

    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(backendConfig)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save board config');
    }

    const savedConfig = await response.json();
    return {
      ...savedConfig,
      boardLocation: this.fromBoardLocationEnum(savedConfig.boardLocation)
    };
  }

  /**
   * Partially update board configuration
   * @param {string} boardLocation - 'brothers' or 'sisters'
   * @param {Object} updates - Partial config updates
   * @returns {Promise<Object>} Updated config
   */
  static async updateConfig(boardLocation, updates) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    
    const response = await fetch(`${BOARD_BASE}/configs/${enumLocation}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update board config');
    }

    const updatedConfig = await response.json();
    return {
      ...updatedConfig,
      boardLocation: this.fromBoardLocationEnum(updatedConfig.boardLocation)
    };
  }

  // ============================================================================
  // WEEKLY CONTENT
  // ============================================================================

  /**
   * Get all weekly content
   * @returns {Promise<Array>} Array of weekly content
   */
  static async getAllWeeklyContent() {
    const response = await fetch(`${BOARD_BASE}/weekly-content`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weekly content');
    }

    const content = await response.json();
    
    // Transform backend format to frontend format
    return content.map(item => ({
      id: `${item.weekId.year}-${item.weekId.weekNumber}`,
      weekNumber: item.weekId.weekNumber,
      year: item.weekId.year,
      verse: item.verse,
      hadith: item.hadith,
      jummahPrayer: this.fromBackendJummah(item)
    }));
  }

  /**
   * Get weekly content for a specific year
   * @param {number} year
   * @returns {Promise<Array>} Array of weekly content
   */
  static async getWeeklyContentByYear(year) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/year/${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch weekly content for year ${year}`);
    }

    const content = await response.json();
    
    return content.map(item => ({
      id: `${item.weekId.year}-${item.weekId.weekNumber}`,
      weekNumber: item.weekId.weekNumber,
      year: item.weekId.year,
      verse: item.verse,
      hadith: item.hadith,
      jummahPrayer: this.fromBackendJummah(item)
    }));
  }

  /**
   * Get specific week's content
   * @param {number} year
   * @param {number} weekNumber
   * @returns {Promise<Object>} Weekly content
   */
  static async getWeeklyContent(year, weekNumber) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content for week ${weekNumber} of ${year}`);
    }

    const item = await response.json();
    return {
      id: `${item.weekId.year}-${item.weekId.weekNumber}`,
      weekNumber: item.weekId.weekNumber,
      year: item.weekId.year,
      verse: item.verse,
      hadith: item.hadith,
      jummahPrayer: this.fromBackendJummah(item)
    };
  }

  /**
   * Create or update weekly content
   * @param {Object} content - Weekly content with year, weekNumber, verse, hadith, jummahPrayer
   * @returns {Promise<Object>} Saved weekly content
   */
  static async saveWeeklyContent(content) {
    const backendFormat = {
      year: content.year,
      weekNumber: content.weekNumber,
      verse: content.verse,
      hadith: content.hadith,
      jummahPrayers: this.toBackendJummahPrayers(content.jummahPrayer)
    };

    const response = await fetch(`${BOARD_BASE}/weekly-content`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(backendFormat)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save weekly content');
    }

    const savedContent = await response.json();
    return {
      id: `${savedContent.weekId.year}-${savedContent.weekId.weekNumber}`,
      weekNumber: savedContent.weekId.weekNumber,
      year: savedContent.weekId.year,
      verse: savedContent.verse,
      hadith: savedContent.hadith,
      jummahPrayer: this.fromBackendJummah(savedContent)
    };
  }

  /**
   * Delete weekly content
   * @param {number} year
   * @param {number} weekNumber
   * @returns {Promise<Object>} Success message
   */
  static async deleteWeeklyContent(year, weekNumber) {
    const response = await fetch(`${BOARD_BASE}/weekly-content/${year}/${weekNumber}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete weekly content');
    }

    return await response.json();
  }

  // ============================================================================
  // POSTERS
  // ============================================================================

  /**
   * Get all posters
   * @returns {Promise<Array>} Array of posters
   */
  static async getAllPosters() {
    const response = await fetch(`${BOARD_BASE}/posters`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posters');
    }

    const posters = await response.json();
    
    // Transform backend format to frontend format
    return posters.map(poster => ({
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000 // Convert seconds to milliseconds
    }));
  }

  /**
   * Get posters for specific board
   * @param {string} boardLocation - 'brothers' or 'sisters'
   * @returns {Promise<Array>} Array of posters
   */
  static async getPostersByBoard(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/posters/by-board?board=${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posters for ${boardLocation}`);
    }

    const posters = await response.json();
    
    return posters.map(poster => ({
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000
    }));
  }

  /**
   * Get single poster
   * @param {string} posterId - UUID
   * @returns {Promise<Object>} Poster
   */
  static async getPoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch poster');
    }

    const poster = await response.json();
    return {
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000
    };
  }

  /**
   * Create poster
   * @param {Object} posterData - { title, duration (ms), startDate, endDate, audience, imageFile }
   * @returns {Promise<Object>} Created poster
   */
  static async createPoster(posterData) {
    const formData = new FormData();
    formData.append('title', posterData.title);
    formData.append('duration', Math.floor(posterData.duration / 1000)); // Convert ms to seconds
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to create poster');
    }

    const poster = await response.json();
    return {
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000
    };
  }

  /**
   * Update poster metadata
   * @param {string} posterId - UUID
   * @param {Object} updates - Partial poster updates
   * @returns {Promise<Object>} Updated poster
   */
  static async updatePoster(posterId, updates) {
    const backendUpdates = { ...updates };
    
    // Transform duration if present
    if (updates.duration !== undefined) {
      backendUpdates.duration = Math.floor(updates.duration / 1000);
    }
    
    // Transform audience if present
    if (updates.audience !== undefined) {
      backendUpdates.audience = this.toAudienceEnum(updates.audience);
    }

    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(backendUpdates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update poster');
    }

    const poster = await response.json();
    return {
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000
    };
  }

  /**
   * Update poster image
   * @param {string} posterId - UUID
   * @param {File} imageFile - New image file
   * @returns {Promise<Object>} Updated poster
   */
  static async updatePosterImage(posterId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${BOARD_BASE}/posters/${posterId}/image`, {
      method: 'PUT',
      headers: this.getMultipartAuthHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update poster image');
    }

    const poster = await response.json();
    return {
      ...poster,
      audience: this.fromAudienceEnum(poster.audience),
      duration: poster.duration * 1000
    };
  }

  /**
   * Delete poster
   * @param {string} posterId - UUID
   * @returns {Promise<Object>} Success message
   */
  static async deletePoster(posterId) {
    const response = await fetch(`${BOARD_BASE}/posters/${posterId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete poster');
    }

    return await response.json();
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  /**
   * Get all events
   * @returns {Promise<Array>} Array of events
   */
  static async getAllEvents() {
    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const events = await response.json();
    
    return events.map(event => ({
      ...event,
      audience: this.fromAudienceEnum(event.audience)
    }));
  }

  /**
   * Get events for specific board
   * @param {string} boardLocation - 'brothers' or 'sisters'
   * @returns {Promise<Array>} Array of events
   */
  static async getEventsByBoard(boardLocation) {
    const enumLocation = this.toBoardLocationEnum(boardLocation);
    const response = await fetch(`${BOARD_BASE}/events/by-board?board=${enumLocation}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events for ${boardLocation}`);
    }

    const events = await response.json();
    
    return events.map(event => ({
      ...event,
      audience: this.fromAudienceEnum(event.audience)
    }));
  }

  /**
   * Get single event
   * @param {string} eventId - UUID
   * @returns {Promise<Object>} Event
   */
  static async getEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch event');
    }

    const event = await response.json();
    return {
      ...event,
      audience: this.fromAudienceEnum(event.audience)
    };
  }

  /**
   * Create event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  static async createEvent(eventData) {
    const backendEvent = {
      ...eventData,
      audience: this.toAudienceEnum(eventData.audience)
    };

    const response = await fetch(`${BOARD_BASE}/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(backendEvent)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create event');
    }

    const event = await response.json();
    return {
      ...event,
      audience: this.fromAudienceEnum(event.audience)
    };
  }

  /**
   * Update event
   * @param {string} eventId - UUID
   * @param {Object} updates - Partial event updates
   * @returns {Promise<Object>} Updated event
   */
  static async updateEvent(eventId, updates) {
    const backendUpdates = { ...updates };
    
    // Transform audience if present
    if (updates.audience !== undefined) {
      backendUpdates.audience = this.toAudienceEnum(updates.audience);
    }

    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(backendUpdates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update event');
    }

    const event = await response.json();
    return {
      ...event,
      audience: this.fromAudienceEnum(event.audience)
    };
  }

  /**
   * Delete event
   * @param {string} eventId - UUID
   * @returns {Promise<Object>} Success message
   */
  static async deleteEvent(eventId) {
    const response = await fetch(`${BOARD_BASE}/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete event');
    }

    return await response.json();
  }
}

export default BoardService;
