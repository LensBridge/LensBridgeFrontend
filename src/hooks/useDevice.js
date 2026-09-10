import { useCallback, useEffect, useMemo, useState } from 'react';
import DeviceService from '../services/DeviceService';
import StompService from '../services/StompService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import { getDeviceStatus } from '../utils/deviceStatus';

const POLL_MS = 30000;

export function useDevice(deviceId) {
  const { can } = useAuth();
  const [device, setDevice] = useState(null);
  const [telemetrySamples, setTelemetrySamples] = useState([]);
  const [lifecycle, setLifecycle] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Without `board:telemetry:subscribe` the SUBSCRIBE is rejected by throwing,
  // which closes the session and kills the command stream alongside it.
  const live = can(PERMISSIONS.BOARD_TELEMETRY_SUBSCRIBE);

  const loadDevice = useCallback(async () => {
    if (!deviceId) return;
    try {
      setError('');
      const data = await DeviceService.getDevice(deviceId);
      setDevice(data);
    } catch (err) {
      setError(err.message || 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadDevice();
    if (!live) return;

    const unsubscribeConnect = StompService.onConnect(loadDevice);
    const unsubscribe = StompService.subscribe(`/topic/devices/${deviceId}`, (event) => {
      setLifecycle((prev) => ({
        ...prev,
        online: event.event === 'online' ? true : event.event === 'offline' ? false : prev.online ?? true,
        lastHeartbeat: event.event === 'heartbeat' ? event.at : prev.lastHeartbeat,
        telemetry: event.telemetry || prev.telemetry,
        lastEventAt: event.at
      }));

      if (event.event === 'heartbeat') {
        setDevice((prev) => prev ? {
          ...prev,
          lastHeartbeat: event.at,
          lastSeenIp: event.telemetry?.ipv4?.[0] || prev.lastSeenIp
        } : prev);
        setTelemetrySamples((prev) => [
          ...prev,
          { at: event.at, ...event.telemetry }
        ].slice(-120));
      } else {
        loadDevice();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeConnect();
    };
  }, [deviceId, live, loadDevice]);

  useEffect(() => {
    if (live) return;
    const timer = setInterval(loadDevice, POLL_MS);
    return () => clearInterval(timer);
  }, [live, loadDevice]);

  const mergedDevice = useMemo(() => {
    if (!device) return null;
    return {
      ...device,
      // Live frames win, but until one arrives the snapshot the GET returned is
      // better than nothing — otherwise the panel reads as dashes for a whole
      // heartbeat interval after every page load.
      telemetry: lifecycle.telemetry || device.telemetry || null,
      status: getDeviceStatus(device, lifecycle)
    };
  }, [device, lifecycle]);

  return { device: mergedDevice, telemetrySamples, loading, error, live, refetch: loadDevice };
}
