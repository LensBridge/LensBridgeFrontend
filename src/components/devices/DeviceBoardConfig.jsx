import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RotateCcw, Loader2, Check, AlertCircle, MessageSquare } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import BoardConfigEditor, { TickerEditor } from '../board/BoardConfigEditor';
import { DEFAULT_DEVICE_CONFIG, toDeviceConfigPatch, toTickerPatch } from '../../models/board';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';

/**
 * Two cards, two endpoints, two permissions.
 *
 * The ticker is a sub-resource under `board:ticker:write`; everything else goes
 * through PATCH /configs/{deviceId} under `board:config:write`. A BOARD_EDITOR
 * holds the first and not the second, so one shared Save would have been a
 * button that always 403s for the role most likely to press it.
 */

function SaveButton({ dirty, saving, saved, disabled, onSave }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={!dirty || saving || disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        saved
          ? 'bg-green-600 text-white'
          : dirty
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-gray-100 text-gray-400'
      }`}
    >
      {saving ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
      ) : saved ? (
        <><Check className="h-4 w-4" />Saved!</>
      ) : (
        <><Save className="h-4 w-4" />Save</>
      )}
    </button>
  );
}

function DiscardButton({ saving, onDiscard }) {
  return (
    <button
      type="button"
      onClick={onDiscard}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      <RotateCcw className="h-4 w-4" />
      Discard
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}

function DeviceBoardConfig({ deviceId, disabled }) {
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
  const configDirty = draft !== null && !same(toDeviceConfigPatch(draft), toDeviceConfigPatch(saved));
  const tickerDirty = draft !== null && !same(toTickerPatch(draft), toTickerPatch(saved));

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
        setError(err.message || 'Failed to load config');
        setSaved(DEFAULT_DEVICE_CONFIG);
        setDraft(DEFAULT_DEVICE_CONFIG);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deviceId]);

  const handleSaveConfig = useCallback(async () => {
    if (!draft) return;
    setConfigSaving(true);
    setError(null);
    try {
      const result = await DeviceService.updateDeviceConfig(deviceId, toDeviceConfigPatch(draft));
      setSaved(result);
      // The response carries the stored ticker too; keep the draft's copy so an
      // unsaved edit in the other card survives this save.
      setDraft({ ...result, ...toTickerPatch(draft) });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Save failed');
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
      setTickerError(err.message || 'Save failed');
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
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Board Configuration</h2>
              <p className="text-sm text-gray-500">
                {canWriteConfig
                  ? 'Prayer times, display, and QR settings for this device.'
                  : 'Prayer times, display, and QR settings for this device. Read-only.'}
              </p>
            </div>
          </div>
          {canWriteConfig && (
            <div className="flex items-center gap-2">
              {configDirty && <DiscardButton saving={configSaving} onDiscard={discardConfig} />}
              <SaveButton
                dirty={configDirty}
                saving={configSaving}
                saved={configSaved}
                disabled={disabled}
                onSave={handleSaveConfig}
              />
            </div>
          )}
        </div>

        <div className="p-6">
          <ErrorBanner message={error} />
          {loading ? (
            <div className="py-10 text-center text-gray-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Loading config...
            </div>
          ) : (
            <BoardConfigEditor config={draft} onUpdate={setDraft} readOnly={!canWriteConfig} />
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ticker</h2>
              <p className="text-sm text-gray-500">
                {canWriteTicker
                  ? 'Saved on its own — a ticker edit never touches the config above.'
                  : 'The copy scrolling along the bottom of this board. Read-only.'}
              </p>
            </div>
          </div>
          {canWriteTicker && (
            <div className="flex items-center gap-2">
              {tickerDirty && <DiscardButton saving={tickerSaving} onDiscard={discardTicker} />}
              <SaveButton
                dirty={tickerDirty}
                saving={tickerSaving}
                saved={tickerSaved}
                disabled={disabled}
                onSave={handleSaveTicker}
              />
            </div>
          )}
        </div>

        <div className="p-6">
          <ErrorBanner message={tickerError} />
          {loading ? (
            <div className="py-10 text-center text-gray-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Loading ticker...
            </div>
          ) : (
            <TickerEditor config={draft} onUpdate={setDraft} readOnly={!canWriteTicker} />
          )}
        </div>
      </section>
    </div>
  );
}

export default DeviceBoardConfig;
