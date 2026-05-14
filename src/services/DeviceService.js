import API_CONFIG from '../config/api';
import AuthService from './AuthService';

const DEVICE_BASE = `${API_CONFIG.BASE_URL}/api/admin/board/devices`;

class DeviceService {
  static getAuthHeaders() {
    const token = AuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...API_CONFIG.HEADERS
    };
  }

  static async parseResponse(response, fallbackMessage) {
    const text = await response.text();
    if (response.ok) {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    let error = {};
    if (text) {
      try {
        error = JSON.parse(text);
      } catch {
        error = { message: text };
      }
    }
    throw new Error(error.message || error.error || fallbackMessage);
  }

  static async listDevices() {
    const response = await fetch(DEVICE_BASE, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.parseResponse(response, 'Failed to fetch devices');
  }

  static async getDevice(deviceId) {
    const response = await fetch(`${DEVICE_BASE}/${encodeURIComponent(deviceId)}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.parseResponse(response, 'Failed to fetch device');
  }

  static async issueEnrollmentToken(request) {
    const response = await fetch(`${DEVICE_BASE}/enrollment-tokens`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    return this.parseResponse(response, 'Failed to issue enrollment token');
  }

  static async revokeDevice(deviceId) {
    const response = await fetch(`${DEVICE_BASE}/${encodeURIComponent(deviceId)}/revoke`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return this.parseResponse(response, 'Failed to revoke device');
  }

  static async issueCommand(deviceId, request) {
    const response = await fetch(`${DEVICE_BASE}/${encodeURIComponent(deviceId)}/commands`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    return this.parseResponse(response, 'Failed to issue command');
  }

  static async listCommands(deviceId) {
    const response = await fetch(`${DEVICE_BASE}/${encodeURIComponent(deviceId)}/commands`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.parseResponse(response, 'Failed to fetch commands');
  }

  static async getDeviceConfig(deviceId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/board/configs/${encodeURIComponent(deviceId)}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.parseResponse(response, 'Failed to fetch device config');
  }

  static async updateDeviceConfig(deviceId, patch) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/board/configs/${encodeURIComponent(deviceId)}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(patch)
    });
    return this.parseResponse(response, 'Failed to update device config');
  }
}

export default DeviceService;
