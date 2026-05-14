import { useCallback, useEffect, useMemo, useState } from 'react';
import DeviceService from '../services/DeviceService';
import StompService from '../services/StompService';
import { getDeviceStatus } from '../utils/deviceStatus';

export function useDeviceList() {
  const [devices, setDevices] = useState([]);
  const [lifecycle, setLifecycle] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDevices = useCallback(async () => {
    try {
      setError('');
      const data = await DeviceService.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
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
  }, [loadDevices]);

  const mergedDevices = useMemo(() => devices.map((device) => ({
    ...device,
    telemetry: lifecycle[device.id]?.telemetry || device.telemetry || null,
    status: getDeviceStatus(device, lifecycle[device.id])
  })), [devices, lifecycle]);

  return { devices: mergedDevices, loading, error, refetch: loadDevices };
}

