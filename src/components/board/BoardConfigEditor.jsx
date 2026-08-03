import { memo, useCallback } from 'react';
import { MapPin, Moon, MessageSquare, Plus, QrCode, Trash2 } from 'lucide-react';
import { CALCULATION_METHODS, TIMEZONES } from '../../models/board';

/**
 * BoardConfigEditor — edits one device's DeviceConfig.
 *
 * The fields here are exactly the ones UpdateBoardConfigRequest accepts:
 * location, darkModeAfterIsha, enableScrollingMessage, scrollingMessages,
 * socialUrl.
 * Anything else is dropped server-side without an error, so adding a control
 * for a field the backend doesn't have produces a setting that silently never
 * applies — which is how poster-cycle and refresh-after-Isha lingered here.
 *
 * Fully controlled: the parent owns `config` and receives every edit.
 */

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';

function BoardConfigEditor({ config, onUpdate }) {
  const setField = useCallback((key, value) => {
    if (!config || !onUpdate) return;
    onUpdate({ ...config, [key]: value });
  }, [config, onUpdate]);

  const setLocationField = useCallback((key, value) => {
    if (!config || !onUpdate) return;
    onUpdate({ ...config, location: { ...(config.location || {}), [key]: value } });
  }, [config, onUpdate]);

  const setMessage = useCallback((index, value) => {
    const messages = [...(config.scrollingMessages || [])];
    messages[index] = value;
    setField('scrollingMessages', messages);
  }, [config, setField]);

  const removeMessage = useCallback((index) => {
    setField('scrollingMessages', (config.scrollingMessages || []).filter((_, i) => i !== index));
  }, [config, setField]);

  if (!config) return null;

  const location = config.location || {};
  const messages = config.scrollingMessages || [];

  // A QR encoding a malformed URL renders fine and fails only when someone
  // scans it, which nobody is around to notice. Validate before it ships.
  const socialUrlError = (() => {
    const value = (config.socialUrl || '').trim();
    if (!value) return '';
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return 'Enter a complete URL, including https://';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Only http:// and https:// links can be opened by a phone camera.';
    }
    return '';
  })();

  // Latitude/longitude are doubles server-side; an empty input must not become
  // NaN, so fall back to the previous value while the field is mid-edit.
  const numeric = (raw, previous) => {
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? (previous ?? 0) : parsed;
  };

  return (
    <div className="space-y-6">
      {/* Location & prayer times */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Location &amp; Prayer Times</h3>
        </header>
        <div className="space-y-4 p-5">
          <p className="text-xs text-gray-500">
            The board computes prayer times itself from these coordinates — there is no
            server-side prayer source, so a wrong timezone here shows wrong times on screen.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                type="text"
                value={location.city || ''}
                onChange={(e) => setLocationField('city', e.target.value)}
                className={INPUT_CLASS}
                placeholder="Mississauga"
              />
            </Field>
            <Field label="Country">
              <input
                type="text"
                value={location.country || ''}
                onChange={(e) => setLocationField('country', e.target.value)}
                className={INPUT_CLASS}
                placeholder="Canada"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={location.latitude ?? ''}
                onChange={(e) => setLocationField('latitude', numeric(e.target.value, location.latitude))}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={location.longitude ?? ''}
                onChange={(e) => setLocationField('longitude', numeric(e.target.value, location.longitude))}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Timezone">
              <select
                value={location.timezone || 'America/Toronto'}
                onChange={(e) => setLocationField('timezone', e.target.value)}
                className={`${INPUT_CLASS} bg-white`}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz.replace('America/', '')}</option>
                ))}
              </select>
            </Field>
            <Field label="Calculation Method">
              <select
                value={location.method || 'ISNA'}
                onChange={(e) => setLocationField('method', e.target.value)}
                className={`${INPUT_CLASS} bg-white`}
              >
                {CALCULATION_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </section>

      {/* Night mode */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Night Mode</h3>
              <p className="text-xs text-gray-500">Dims the board after Isha</p>
            </div>
          </div>
          <Toggle
            checked={!!config.darkModeAfterIsha}
            onChange={(v) => setField('darkModeAfterIsha', v)}
            label="Enable night mode after Isha"
          />
        </header>
      </section>

      {/* Stay Connected QR */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <QrCode className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Stay Connected QR</h3>
            <p className="text-xs text-gray-500">Encoded on the board&apos;s closing slide</p>
          </div>
        </header>
        <div className="p-5">
          <Field
            label="Social link"
            hint={
              socialUrlError
                ? socialUrlError
                : config.socialUrl?.trim()
                  ? 'Scanning the closing slide opens this link.'
                  : 'Leave empty to show the closing slide without a QR code.'
            }
          >
            <input
              type="url"
              inputMode="url"
              value={config.socialUrl || ''}
              onChange={(e) => setField('socialUrl', e.target.value)}
              placeholder="https://instagram.com/utmmsa"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 ${
                socialUrlError ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </Field>
        </div>
      </section>

      {/* Scrolling messages */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Scrolling Messages</h3>
              <p className="text-xs text-gray-500">Cycled in the ticker along the bottom</p>
            </div>
          </div>
          <Toggle
            checked={!!config.enableScrollingMessage}
            onChange={(v) => setField('enableScrollingMessage', v)}
            label="Enable scrolling messages"
          />
        </header>

        {config.enableScrollingMessage && (
          <div className="space-y-3 p-5">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400">
                No messages — the ticker stays hidden until you add one.
              </p>
            )}
            {messages.map((message, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(index, e.target.value)}
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="Enter message..."
                />
                <button
                  type="button"
                  onClick={() => removeMessage(index)}
                  aria-label={`Remove message ${index + 1}`}
                  className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setField('scrollingMessages', [...messages, ''])}
              className="flex items-center gap-2 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Message
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default memo(BoardConfigEditor);
