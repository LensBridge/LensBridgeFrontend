import { api } from '../api/client';

/**
 * The public Minbar read model — what the app and the boards actually see.
 *
 * Read-only by design, not for want of endpoints. Every call below is the
 * unauthenticated `/api/minbar/**` surface, already filtered to one audience,
 * and the value of having it in an admin console is verification: it is the
 * only way to check that an edit made under `/api/admin/**` came out the far
 * end looking the way it was meant to, for the right audience.
 *
 * Writing a prayer space is a different job and lives in PrayerSpaceService,
 * against `/api/admin/minbar/prayer-spaces` — every space regardless of who it
 * is listed to, behind `board:prayerspace:write`.
 */
class MinbarService {
  /** @template T @param {{data?: T, error?: {message?: string}}} r @param {string} fallback @returns {T} */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  /** @param {'brothers'|'sisters'|'both'} audience */
  static async listPrayerSpaces(audience = 'both') {
    return this.unwrap(
      await api.GET('/api/minbar/prayer-spaces', { params: { query: { audience } } }),
      'Failed to load prayer spaces'
    ) ?? [];
  }

  /** Includes the step-by-step directions, which the list endpoint omits. */
  static async getPrayerSpace(id) {
    return this.unwrap(
      await api.GET('/api/minbar/prayer-spaces/{id}', { params: { path: { id } } }),
      'Failed to load prayer space'
    );
  }

  /**
   * One month of events as the app renders them, enriched with ticket
   * availability when tCketManage is enabled. Month is 1-based.
   *
   * @param {{ audience?: 'brothers'|'sisters'|'both', year: number, month: number }} options
   */
  static async listEvents({ audience = 'both', year, month }) {
    return this.unwrap(
      await api.GET('/api/minbar/events', { params: { query: { audience, year, month } } }),
      'Failed to load events'
    ) ?? [];
  }

  /** The payload a kiosk renders, for previewing a device's board without one. */
  static async devicePayload(deviceId) {
    return this.unwrap(
      await api.GET('/api/musallah/payload', { params: { query: { deviceId } } }),
      'Failed to load board payload'
    );
  }
}

export default MinbarService;
