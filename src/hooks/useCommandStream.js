import { useCallback, useEffect, useMemo, useState } from 'react';
import DeviceService from '../services/DeviceService';
import StompService from '../services/StompService';

function statusFromResult(resultStatus) {
  if (resultStatus === 'ok') return 'SUCCEEDED';
  if (resultStatus === 'timeout') return 'TIMEOUT';
  if (resultStatus === 'rejected') return 'REJECTED';
  return 'FAILED';
}

function commandIdOf(value) {
  return value?.commandId || value?.id || null;
}

function normalizeCommandEvent(event) {
  return {
    ...event,
    commandId: commandIdOf(event)
  };
}

function stripHeavyEventPayload(event) {
  if (event?.event !== 'result' || event?.kind !== 'chrome.screenshot' || !event?.output?.base64) {
    return event;
  }

  return {
    ...event,
    output: {
      ...event.output,
      base64: '[omitted from event history]'
    }
  };
}

function mergeCommandEvent(command, event) {
  const next = { ...command, status: event.status || command.status };
  next.id = command.id || event.commandId;
  next.commandId = command.commandId || event.commandId;
  next.deviceId = command.deviceId || event.deviceId;
  next.kind = command.kind || event.kind;
  if (event.event === 'issued') next.issuedAt = event.issuedAt || event.at || next.issuedAt;
  if (event.event === 'delivered') next.deliveredAt = event.at;
  if (event.event === 'acked') next.ackedAt = event.at;
  if (event.event === 'progress') {
    next.startedAt = next.startedAt || event.at;
    next.progress = {
      stage: event.stage,
      message: event.message,
      percent: event.percent,
      at: event.at
    };
  }
  if (event.event === 'result') {
    next.finishedAt = event.at;
    next.status = event.status ? statusFromResult(event.status) : next.status;
    next.output = event.output;
    next.errorMessage = event.errorMessage;
    next.durationMs = event.durationMs;
  }
  next.events = [...(next.events || []), stripHeavyEventPayload(event)].slice(-30);
  return next;
}

export function upsertCommand(prev, incoming) {
  const incomingId = commandIdOf(incoming);
  if (!incomingId) return prev;

  const existing = prev.find((command) => commandIdOf(command) === incomingId);
  const normalizedIncoming = {
    ...incoming,
    id: incoming.id || incoming.commandId,
    commandId: incoming.commandId || incoming.id
  };

  if (!existing) {
    return [normalizedIncoming, ...prev].slice(0, 50);
  }

  return prev.map((command) => (
    commandIdOf(command) === incomingId
      ? { ...command, ...normalizedIncoming, id: command.id || normalizedIncoming.id, commandId: command.commandId || normalizedIncoming.commandId }
      : command
  ));
}

export function useCommandStream(deviceId) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCommands = useCallback(async () => {
    if (!deviceId) return;
    try {
      setError('');
      const data = await DeviceService.listCommands(deviceId);
      setCommands(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load commands');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadCommands();
    const unsubscribeConnect = StompService.onConnect(loadCommands);
    const unsubscribe = StompService.subscribe(`/topic/devices/${deviceId}/commands`, (rawEvent) => {
      const event = normalizeCommandEvent(rawEvent);
      if (!event.commandId) return;

      setCommands((prev) => {
        const existing = prev.find((command) => commandIdOf(command) === event.commandId);
        if (!existing) {
          return [{
            id: event.commandId,
            commandId: event.commandId,
            deviceId: event.deviceId,
            kind: event.kind,
            status: event.status || 'PENDING',
            issuedAt: event.issuedAt || event.at,
            issuedBy: 'Live update',
            payload: null,
            deadlineMs: 30000,
            deliveredAt: null,
            ackedAt: null,
            startedAt: null,
            finishedAt: null,
            output: null,
            errorMessage: null,
            events: [stripHeavyEventPayload(event)]
          }, ...prev].slice(0, 50);
        }

        return prev.map((command) => (
          commandIdOf(command) === event.commandId ? mergeCommandEvent(command, event) : command
        ));
      });
    });

    return () => {
      unsubscribe();
      unsubscribeConnect();
    };
  }, [deviceId, loadCommands]);

  const sortedCommands = useMemo(() => [...commands].sort((a, b) => (
    new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime()
  )), [commands]);

  return { commands: sortedCommands, loading, error, refetch: loadCommands, setCommands };
}
