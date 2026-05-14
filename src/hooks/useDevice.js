import { useCallback, useEffect, useMemo, useState } from 'react';
import DeviceService from '../services/DeviceService';
import StompService from '../services/StompService';
import { getDeviceStatus } from '../utils/deviceStatus';

export function useDevice(deviceId) {
  const [device, setDevice] = useState(null);
  const [telemetrySamples, setTelemetrySamples] = useState([]);
  const [lifecycle, setLifecycle] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [deviceId, loadDevice]);

  const mergedDevice = useMemo(() => {
    if (!device) return null;
    return {
      ...device,
      telemetry: lifecycle.telemetry || null,
      status: getDeviceStatus(device, lifecycle)
    };
  }, [device, lifecycle]);

  return { device: mergedDevice, telemetrySamples, loading, error, refetch: loadDevice };
}

