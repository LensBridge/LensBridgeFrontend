import { useCallback, useEffect, useMemo, useState } from 'react';
import DeviceService from '../services/DeviceService';
import StompService from '../services/StompService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import { getDeviceStatus } from '../utils/deviceStatus';

/**
 * How often to refetch when there is no live feed. Heartbeats arrive far more
 * often than this; the poll only exists so the page isn't frozen on its first
 * render for someone without the telemetry grant.
 */
const POLL_MS = 30000;

/**
 * `enabled: false` skips the fetch entirely, for callers that render without
 * `board:device:read` — a 403 here would surface as an error banner on a page
 * the user is otherwise allowed to use.
 */
export function useDeviceList({ enabled = true } = {}) {
  const { can } = useAuth();
  const [devices, setDevices] = useState([]);
  const [lifecycle, setLifecycle] = useState({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  // A denied SUBSCRIBE closes the whole WebSocket session server-side, so an
  // unauthorized attempt would take down every other subscription on the page.
  const live = enabled && can(PERMISSIONS.BOARD_TELEMETRY_SUBSCRIBE);

  const loadDevices = useCallback(async () => {
    if (!enabled) return;
    try {
      setError('');
      const data = await DeviceService.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    loadDevices();
    if (!live) return;

    const unsubscribeConnect = StompService.onConnect(loadDevices);
    const unsubscribe = StompService.subscribe('/topic/devices', (event) => {
      setLifecycle((prev) => ({
        ...prev,
        [event.deviceId]: {
          ...(prev[event.deviceId] || {}),
          online: event.event === 'online' ? true : event.event === 'offline' ? false : prev[event.deviceId]?.online ?? true,
          lastHeartbeat: event.event === 'heartbeat' ? event.at : prev[event.deviceId]?.lastHeartbeat,
          telemetry: event.telemetry || prev[event.deviceId]?.telemetry,
          lastEventAt: event.at
        }
      }));
      if (event.event === 'heartbeat') {
        setDevices((prev) => prev.map((device) => (
          device.id === event.deviceId
            ? {
                ...device,
                lastHeartbeat: event.at,
                lastSeenIp: event.telemetry?.ipv4?.[0] || device.lastSeenIp
              }
            : device
        )));
      }
      if (event.event === 'online' || event.event === 'offline') {
        loadDevices();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeConnect();
    };
  }, [enabled, live, loadDevices]);

  useEffect(() => {
    if (!enabled || live) return;
    const timer = setInterval(loadDevices, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, live, loadDevices]);

  const mergedDevices = useMemo(() => devices.map((device) => ({
    ...device,
    telemetry: lifecycle[device.id]?.telemetry || device.telemetry || null,
    status: getDeviceStatus(device, lifecycle[device.id])
  })), [devices, lifecycle]);

  return { devices: mergedDevices, loading, error, live, refetch: loadDevices };
}
