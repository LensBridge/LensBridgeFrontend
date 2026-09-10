import { useState, useEffect, useCallback } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import BoardConfigEditor, { TickerEditor } from '../board/BoardConfigEditor';
import {
  DEFAULT_DEVICE_CONFIG,
  slideDurationErrors,
  toDeviceConfigPatch,
  toTickerPatch,
} from '../../models/board';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { Panel, Button, ErrorNote, Skeleton } from '../ui';

/**
 * Two panels, two endpoints, two permissions.
 *
 * The ticker is a sub-resource under `board:ticker:write`; everything else goes
 * through `PATCH /configs/{deviceId}` under `board:config:write`. A BOARD_EDITOR
 * holds the first and not the second, so one shared Save would be a button that
 * always 403s for the role most likely to press it.
 *
 * Both panels edit one `draft` object, and each save carefully preserves the
 * other's fields — the config response carries the stored ticker, so writing it
 * straight back over the draft would silently discard an unsaved ticker edit.
 */
function SaveControls({ dirty, saving, saved, disabled, onSave, onDiscard }) {
  return (
    <div className="flex items-center gap-2">
      {dirty && (
        <Button size="sm" variant="ghost" icon={RotateCcw} disabled={saving} onClick={onDiscard}>
          Discard
        </Button>
      )}
      <Button
        size="sm"
        variant={saved ? 'secondary' : 'primary'}
        icon={saved ? Check : Save}
        loading={saving}
        disabled={!dirty || disabled}
        onClick={onSave}
        className={saved ? 'text-good border-good/40' : undefined}
      >
        {saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-3.5 w-1/4" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export default function DeviceBoardConfig({ deviceId, disabled }) {
  const { can } = useAuth();
  const canWriteConfig = can(PERMISSIONS.BOARD_CONFIG_WRITE);
  const canWriteTicker = can(PERMISSIONS.BOARD_TICKER_WRITE);

  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [tickerSaving, setTickerSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [tickerSaved, setTickerSaved] = useState(false);
  const [error, setError] = useState(null);
  const [tickerError, setTickerError] = useState(null);

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const configDirty =
    draft !== null && !same(toDeviceConfigPatch(draft), toDeviceConfigPatch(saved));
  const tickerDirty = draft !== null && !same(toTickerPatch(draft), toTickerPatch(saved));

  // A slide duration outside 5–120 is a guaranteed 400, so hold Save rather than
  // spend a round trip on it. The ticker saves through its own endpoint and
  // never carries these fields, so its button is unaffected.
  const configInvalid = Object.keys(slideDurationErrors(draft)).length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    DeviceService.getDeviceConfig(deviceId)
      .then((cfg) => {
        if (cancelled) return;
        // A device enrolled but never configured has no row yet; seed the form
        // with defaults so the first save creates one.
        const resolved = cfg || DEFAULT_DEVICE_CONFIG;
        setSaved(resolved);
        setDraft(resolved);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load the config.');
        setSaved(DEFAULT_DEVICE_CONFIG);
        setDraft(DEFAULT_DEVICE_CONFIG);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const handleSaveConfig = useCallback(async () => {
    if (!draft) return;
    setConfigSaving(true);
    setError(null);
    try {
      const result = await DeviceService.updateDeviceConfig(deviceId, toDeviceConfigPatch(draft));
      setSaved(result);
      // The response carries the stored ticker too; keep the draft's copy so an
      // unsaved edit in the other panel survives this save.
      setDraft({ ...result, ...toTickerPatch(draft) });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setConfigSaving(false);
    }
  }, [deviceId, draft]);

  const handleSaveTicker = useCallback(async () => {
    if (!draft) return;
    setTickerSaving(true);
    setTickerError(null);
    try {
      const result = await DeviceService.updateDeviceTicker(deviceId, toTickerPatch(draft));
      setSaved(result);
      setDraft({ ...draft, ...toTickerPatch(result) });
      setTickerSaved(true);
      setTimeout(() => setTickerSaved(false), 2000);
    } catch (err) {
      setTickerError(err.message || 'Save failed.');
    } finally {
      setTickerSaving(false);
    }
  }, [deviceId, draft]);

  const discardConfig = useCallback(() => {
    setDraft((prev) => ({ ...saved, ...toTickerPatch(prev) }));
  }, [saved]);

  const discardTicker = useCallback(() => {
    setDraft((prev) => ({ ...prev, ...toTickerPatch(saved) }));
  }, [saved]);

  return (
    <div className="space-y-6">
      <Panel
        caption="Device config"
        title={canWriteConfig ? 'Prayer times, layout and QR' : 'Prayer times, layout and QR (read-only)'}
        actions={
          canWriteConfig && (
            <SaveControls
              dirty={configDirty}
              saving={configSaving}
              saved={configSaved}
              disabled={disabled || configInvalid}
              onSave={handleSaveConfig}
              onDiscard={discardConfig}
            />
          )
        }
      >
        {error && (
          <div className="mb-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        {loading ? (
          <LoadingBody />
        ) : (
          <BoardConfigEditor config={draft} onUpdate={setDraft} readOnly={!canWriteConfig} />
        )}
      </Panel>

      <Panel
        caption="Ticker"
        title={canWriteTicker ? 'The copy scrolling along the bottom' : 'The copy scrolling along the bottom (read-only)'}
        actions={
          canWriteTicker && (
            <SaveControls
              dirty={tickerDirty}
              saving={tickerSaving}
              saved={tickerSaved}
              disabled={disabled}
              onSave={handleSaveTicker}
              onDiscard={discardTicker}
            />
          )
        }
      >
        {tickerError && (
          <div className="mb-4">
            <ErrorNote>{tickerError}</ErrorNote>
          </div>
        )}
        {loading ? <LoadingBody /> : <TickerEditor config={draft} onUpdate={setDraft} readOnly={!canWriteTicker} />}
      </Panel>
    </div>
  );
}
