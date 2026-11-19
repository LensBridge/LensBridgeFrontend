import { api } from '../api/client';
import { filenameFrom } from '../utils/usbKit';

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

  /**
   * "Add board": the board exists before it is ever switched on, with no key.
   * Its setup file and content can be downloaded at once.
   */
  static async createDevice({ displayName, audience, location }) {
    return this.unwrap(
      await api.POST('/api/admin/board/devices', { body: { displayName, audience, location } }),
      'Failed to add the board'
    );
  }

  /**
   * One-time token for `musallahboard-agent enroll --token` over SSH, bound to
   * this board (the maintainer path; boards set up by a setup file need none).
   */
  static async issueDeviceEnrollmentToken(deviceId) {
    return this.unwrap(
      await api.POST('/api/admin/board/devices/{deviceId}/enrollment-tokens', {
        params: { path: { deviceId } },
      }),
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
   * Downloads are fetched as Blobs so the request carries the Bearer token (a
   * plain <a href> would not). Building one downloads every poster image, so
   * it can take several seconds.
   * @param {{ data?: any, error?: any, response: Response }} result
   * @param {string} fallbackFilename
   * @param {string} what
   * @returns {{ blob: Blob, filename: string, omitted: string }}
   */
  static downloaded({ data, error, response }, fallbackFilename, what) {
    if (error !== undefined || !data) {
      const fallback = {
        400: 'Days must be between 1 and 92.',
        403: 'Your account may not download this. Setup files need the enroll permission.',
        404: 'This board no longer exists.',
        409: 'This board has been revoked.',
        502: 'A poster image could not be fetched. Try again in a moment.',
        503: 'The server is not set up to sign board files (or has no backend URL for online boards).',
      }[response.status] || `Failed to build the ${what}`;
      throw new Error((typeof error === 'object' && error?.message) || fallback);
    }
    return {
      blob: data,
      filename: filenameFrom(response.headers.get('Content-Disposition'), fallbackFilename),
      // Set when the kit could not include the latest board app or agent.
      omitted: response.headers.get('X-Usb-Kit-Omitted') || '',
    };
  }

  /** This board's content alone, a signed .mbu (the weekly update for one board). */
  static async downloadOfflineBundle(deviceId, days) {
    return this.downloaded(await api.GET('/api/admin/board/devices/{deviceId}/offline-bundle', {
      params: { path: { deviceId }, query: { days } },
      parseAs: 'blob',
    }), `musallahboard-content-${String(deviceId).slice(0, 8)}.mbu`, 'content file');
  }

  /**
   * The board's setup file. Online adds the backend URL and a new claim
   * secret, which makes earlier online setup files for this board useless.
   */
  static async downloadSetupFile(deviceId, online) {
    return this.downloaded(await api.GET('/api/admin/board/devices/{deviceId}/setup-file', {
      params: { path: { deviceId }, query: { online } },
      parseAs: 'blob',
    }), `musallahboard-setup-${String(deviceId).slice(0, 8)}.mbu`, 'setup file');
  }

  /** A zip with a MusallahBoard/ folder: content, optionally setup, latest app and agent. */
  static async downloadUsbKit(deviceId, { days, includeSetup, online }) {
    return this.downloaded(await api.GET('/api/admin/board/devices/{deviceId}/usb-kit', {
      params: { path: { deviceId }, query: { days, includeSetup, online } },
      parseAs: 'blob',
    }), `musallahboard-usb-kit-${String(deviceId).slice(0, 8)}.zip`, 'USB kit');
  }

  /** The same kit with the files of every board that is not revoked. */
  static async downloadAllBoardsUsbKit({ days, includeSetup, online }) {
    return this.downloaded(await api.GET('/api/admin/board/usb-kit', {
      params: { query: { days, includeSetup, online } },
      parseAs: 'blob',
    }), 'musallahboard-usb-kit-all.zip', 'USB kit');
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
