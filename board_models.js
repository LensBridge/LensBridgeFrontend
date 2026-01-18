/**
 * =====================================================
 * MusallahBoard Data Models
 * =====================================================
 * Type definitions for all data entities used throughout
 * the application. These serve as the contract between
 * the frontend and backend API.
 * =====================================================
 */

// =====================================================
// Location & Configuration
// =====================================================

/**
 * @typedef {Object} Location
 * @property {string} city - City name
 * @property {string} country - Country name or code
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {string} timezone - IANA timezone string (e.g., "America/Toronto")
 * @property {number} method - Prayer calculation method (ISNA = 2)
 */

/**
 * @typedef {Object} JummahPrayer
 * @property {string} time - Display time (e.g., "12:30 PM")
 * @property {string} khatib - Name of the khatib
 * @property {string} location - Location/room
 */

/**
 * @typedef {Object} BoardConfig
 * @property {Location} location - Location settings
 * @property {BoardLocation} boardLocation - Which musallah this board is located in
 * @property {JummahPrayer[]} jummahPrayers - Jummah prayer schedule (max 3)
 * @property {number} posterCycleInterval - Default poster display duration (ms)
 * @property {number} refreshAfterIshaMinutes - Minutes after Isha to refresh
 * @property {boolean} darkModeAfterIsha - Enable dark mode after Isha
 * @property {number} darkModeMinutesAfterIsha - Minutes after Isha to enable dark mode
 * @property {boolean} enableScrollingMessage - Show scrolling message bar
 * @property {string} scrollingMessage - Scrolling message text
 */

// =====================================================
// Events
// =====================================================

/**
 * @typedef {'brothers' | 'sisters' | 'both'} Audience
 */

/**
 * @typedef {'brothers' | 'sisters'} BoardLocation
 */

/**
 * @typedef {Object} Event
 * @property {number|string} id - Unique identifier
 * @property {string} name - Event name/title
 * @property {number} startTimestamp - Start time (Unix timestamp in ms)
 * @property {number} endTimestamp - End time (Unix timestamp in ms)
 * @property {string} [location] - Event location
 * @property {string} [description] - Event description
 * @property {boolean} [allDay] - Whether this is an all-day event
 */


// =====================================================
// Posters
// =====================================================

/**
 * @typedef {Object} Poster
 * @property {number|string} id - Unique identifier
 * @property {string} title - Poster title
 * @property {string} image - Image URL/path
 * @property {number} duration - Display duration (ms)
 * @property {string} [startDate] - Start date (ISO string, e.g., "2025-12-01")
 * @property {string} [endDate] - End date (ISO string)
 * @property {Audience} [audience] - Target audience
 */

// =====================================================
// Islamic Content
// =====================================================

/**
 * @typedef {Object} IslamicQuote
 * @property {string} arabic - Arabic text
 * @property {string} transliteration - Transliteration
 * @property {string} translation - English translation
 * @property {string} reference - Source reference
 */

/**
 * @typedef {Object} DailyContent
 * @property {IslamicQuote} verse - Verse of the day
 * @property {IslamicQuote} hadith - Hadith of the day
 */

/**
 * Creates a normalized IslamicQuote object
 * @param {Partial<IslamicQuote>} data
 * @returns {IslamicQuote}
 */
export function createIslamicQuote(data) {
  return {
    arabic: data.arabic ?? '',
    transliteration: data.transliteration ?? '',
    translation: data.translation ?? '',
    reference: data.reference ?? '',
  };
}

// =====================================================
// Prayer Times
// =====================================================


// =====================================================
// Slideshow Frames
// =====================================================

/**
 * @typedef {'weekAtGlance' | 'today' | 'nextPrayer' | 'poster' | 'quotes' | 'socialMediaPromotion'} FrameType
 */

/**
 * @typedef {Object} FrameDefinition
 * @property {string} id - Unique frame identifier
 * @property {FrameType} type - Frame type
 * @property {number | 'auto'} [duration] - Display duration (ms) or 'auto'
 * @property {number|string} [posterId] - Poster ID (for poster frames)
 * @property {string} [instagramHandle] - Instagram handle (for social media frames)
 */

/**
 * Creates a frame definition
 * @param {Partial<FrameDefinition> & { type: FrameType }} data
 * @returns {FrameDefinition}
 */
export function createFrameDefinition(data) {
  return {
    id: data.id ?? `frame-${crypto.randomUUID()}`,
    type: data.type,
    duration: data.duration ?? 'auto',
    ...data,
  };
}

// =====================================================
// API Response Types
// =====================================================

/**
 * @typedef {Object} BoardPayload
 * @property {BoardConfig} boardConfig - Board configuration
 * @property {Event[]} events - Events list
 * @property {Poster[]} posters - Posters list
 * @property {FrameDefinition[]} frames - Frame definitions for slideshow
 * @property {DailyContent} dailyContent - Islamic content
 * @property {Weather} [weather] - Weather data (from backend)
 */

// =====================================================
// Constants
// =====================================================
