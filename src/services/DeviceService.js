import { api } from '../api/client';

/**
 * Board device administration.
 *
 * Every call goes through the generated client, so these now refresh an expired
 * access token and retry instead of failing with a bare 401 -- the hand-rolled
 * `getAuthHeaders()` this replaced attached a token but never renewed one.
 */
class DeviceService {
  /**
   * openapi-fetch reports failures as a value rather than throwing. Callers here
   * expect exceptions, so unwrap and rethrow with the server's message.
   * @template T
   * @param {{ data?: T, error?: { message?: string } }} result
   * @param {string} fallbackMessage
   * @returns {T}
   */
  static unwrap({ data, error }, fallbackMessage) {
    if (error) throw new Error(error.message || fallbackMessage);
    return /** @type {T} */ (data);
  }

  static async listDevices() {
    return this.unwrap(await api.GET('/api/admin/board/devices', {}), 'Failed to fetch devices');
  }

  static async getDevice(deviceId) {
    return this.unwrap(
      await api.GET('/api/admin/board/devices/{deviceId}', { params: { path: { deviceId } } }),
      'Failed to fetch device'
    );
  }

  /** Rename a board. The name is what admins see; the board never shows it. */
  static async renameDevice(deviceId, displayName) {
    return this.unwrap(
      await api.PATCH('/api/admin/board/devices/{deviceId}', {
        params: { path: { deviceId } },
        body: { displayName },
      }),
      'Failed to rename device'
    );
  }

  static async issueEnrollmentToken(request) {
    return this.unwrap(
      await api.POST('/api/admin/board/devices/enrollment-tokens', { body: request }),
      'Failed to issue enrollment token'
    );
  }

  static async revokeDevice(deviceId) {
    return this.unwrap(
      await api.POST('/api/admin/board/devices/{deviceId}/revoke', { params: { path: { deviceId } } }),
      'Failed to revoke device'
    );
  }

  static async issueCommand(deviceId, request) {
    return this.unwrap(
      await api.POST('/api/admin/board/devices/{deviceId}/commands', {
        params: { path: { deviceId } },
        body: request,
      }),
      'Failed to issue command'
    );
  }

  /**
   * Content bundle for a board with no internet, fetched as a Blob so the
   * request carries the Bearer token (a plain <a href> would not).
   * Bundling downloads every referenced poster, so this can take several seconds.
   * @returns {Promise<{ blob: Blob, filename: string }>}
   */
  static async downloadOfflineBundle(deviceId, days) {
    const { data, error, response } = await api.GET('/api/admin/board/devices/{deviceId}/offline-bundle', {
      params: { path: { deviceId }, query: { days } },
      parseAs: 'blob',
    });
    if (error !== undefined || !data) {
      const fallback = {
        400: 'Days must be between 1 and 31.',
        404: 'This device no longer exists.',
        409: 'This device has been revoked, so no bundle can be built for it.',
        502: 'A poster image could not be fetched. Try again in a moment.',
      }[response.status] || 'Failed to build the offline bundle';
      throw new Error((typeof error === 'object' && error?.message) || fallback);
    }
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const filename = match?.[1] || `musallahboard-${String(deviceId).slice(0, 8)}.zip`;
    return { blob: data, filename };
  }

  static async listCommands(deviceId) {
    return this.unwrap(
      await api.GET('/api/admin/board/devices/{deviceId}/commands', { params: { path: { deviceId } } }),
      'Failed to fetch commands'
    );
  }

  static async getDeviceConfig(deviceId) {
    return this.unwrap(
      await api.GET('/api/admin/board/configs/{deviceId}', { params: { path: { deviceId } } }),
      'Failed to fetch device config'
    );
  }

  static async updateDeviceConfig(deviceId, patch) {
    return this.unwrap(
      await api.PATCH('/api/admin/board/configs/{deviceId}', {
        params: { path: { deviceId } },
        body: patch,
      }),
      'Failed to update device config'
    );
  }

  /**
   * The ticker is its own sub-resource so `board:ticker:write` can be granted
   * without `board:config:write` -- a BOARD_EDITOR changes the copy scrolling
   * along the bottom without also being able to move the board's coordinates.
   */
  static async updateDeviceTicker(deviceId, { scrollingMessages, enableScrollingMessage }) {
    return this.unwrap(
      await api.PATCH('/api/admin/board/configs/{deviceId}/ticker', {
        params: { path: { deviceId } },
        body: { scrollingMessages, enableScrollingMessage },
      }),
      'Failed to update ticker'
    );
  }
}

export default DeviceService;
