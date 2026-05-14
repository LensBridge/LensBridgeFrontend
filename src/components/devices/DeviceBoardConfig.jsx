import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Save, RotateCcw, Loader2, Check, AlertCircle } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import BoardConfigEditor from '../board/BoardConfigEditor';

const DEFAULT_CONFIG = {
  location: {
    city: 'Mississauga',
    country: 'Canada',
    latitude: 43.5890,
    longitude: -79.6441,
    timezone: 'America/Toronto',
    method: 'ISNA'
  },
  posterCycleIntervalMs: 10000,
  refreshAfterIshaMinutes: 30,
  darkModeAfterIsha: true,
  darkModeAfterIshaMinutes: 45,
  enableScrollingMessage: true,
  scrollingMessages: ['Welcome to UTM MSA - Follow us @utmmsa for updates!']
};

function DeviceBoardConfig({ deviceId, disabled }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const draftRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    DeviceService.getDeviceConfig(deviceId)
      .then((cfg) => {
        if (cancelled) return;
        const resolved = cfg || { ...DEFAULT_CONFIG };
        draftRef.current = resolved;
        setConfig(resolved);
      })
      .catch(() => {
        if (cancelled) return;
        draftRef.current = { ...DEFAULT_CONFIG };
        setConfig({ ...DEFAULT_CONFIG });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deviceId]);

  const handleUpdate = useCallback((updated) => {
    draftRef.current = updated;
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draftRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await DeviceService.updateDeviceConfig(deviceId, draftRef.current);
      draftRef.current = saved;
      setConfig(saved);
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [deviceId]);

  const handleDiscard = useCallback(() => {
    draftRef.current = config;
    setDirty(false);
    setConfig((c) => ({ ...c }));
  }, [config]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Board Configuration</h2>
            <p className="text-sm text-gray-500">Prayer times, display, and scrolling message settings for this device.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              saveSuccess
                ? 'bg-green-600 text-white'
                : dirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : saveSuccess ? (
              <><Check className="h-4 w-4" />Saved!</>
            ) : (
              <><Save className="h-4 w-4" />Save</>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-10 text-center text-gray-500">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            Loading config...
          </div>
        ) : (
          <BoardConfigEditor
            config={config}
            onUpdate={handleUpdate}
            showMessage={() => {}}
            hideLocationToggle
          />
        )}
      </div>
    </section>
  );
}

export default DeviceBoardConfig;
