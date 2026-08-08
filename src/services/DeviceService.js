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
