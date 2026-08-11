import { memo, useCallback, useState } from 'react';
import { MapPin, Moon, MessageSquare, Plus, Timer, Trash2 } from 'lucide-react';
import {
  AGENDA_AUTO_RANGE_LABEL,
  CALCULATION_METHODS,
  DEFAULT_AGENDA_DURATION_SECONDS,
  SLIDE_DURATION_MAX_SECONDS,
  SLIDE_DURATION_MIN_SECONDS,
  TIMEZONES,
  slideDurationErrors
} from '../../models/board';

/**
 * BoardConfigEditor — edits one device's DeviceConfig, minus the ticker.
 *
 * The fields here are exactly the ones UpdateBoardConfigRequest accepts:
 * location, darkModeAfterIsha, agendaDurationSeconds, nextPrayerDurationSeconds.
 * Anything else is dropped server-side without an error, so adding a control
 * for a field the backend doesn't have produces a setting that silently never
 * applies — which is how poster-cycle and refresh-after-Isha lingered here.
 *
 * `socialUrl` used to be here too, as a "Stay Connected QR" section. It is gone
 * from DeviceConfig, from UpdateBoardConfigRequest and from the database. The
 * QR destination is no longer one value per board: it lives on each
 * PromotableSocialMedia record instead, which is what lets a single board
 * promote several accounts. Edit those on the Socials tab.
 *
 * The scrolling ticker moved to TickerEditor below: it is its own sub-resource
 * under `board:ticker:write`, which a BOARD_EDITOR holds without holding
 * `board:config:write`. Keeping one form would mean one Save the editor could
 * never press.
 *
 * Fully controlled: the parent owns `config` and receives every edit.
 */

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

const INPUT_BASE_CLASS =
  'w-full rounded-lg border px-3 py-2.5 transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500';

const INPUT_CLASS = `${INPUT_BASE_CLASS} border-gray-200`;

/**
 * The border colour has to be picked, not appended: two `border-*` utilities on
 * one element resolve by their order in the stylesheet, not in the attribute,
 * so `${INPUT_CLASS} border-red-300` is a coin flip.
 */
const inputClass = (error, extra = '') =>
  `${INPUT_BASE_CLASS} ${error ? 'border-red-300' : 'border-gray-200'} ${extra}`;

function BoardConfigEditor({ config, onUpdate, readOnly = false }) {
  const setField = useCallback((key, value) => {
    if (!config || !onUpdate) return;
    onUpdate({ ...config, [key]: value });
  }, [config, onUpdate]);

  const setLocationField = useCallback((key, value) => {
    if (!config || !onUpdate) return;
    onUpdate({ ...config, location: { ...(config.location || {}), [key]: value } });
  }, [config, onUpdate]);

  // Turning Auto off has to put *some* number in the box. Remember the one the
  // admin last typed so a mis-click on the toggle is undoable.
  const [lastAgendaSeconds, setLastAgendaSeconds] = useState(
    typeof config?.agendaDurationSeconds === 'number' && config.agendaDurationSeconds > 0
      ? config.agendaDurationSeconds
      : DEFAULT_AGENDA_DURATION_SECONDS
  );

  if (!config) return null;

  const location = config.location || {};

  // Latitude/longitude are doubles server-side; an empty input must not become
  // NaN, so fall back to the previous value while the field is mid-edit.
  const numeric = (raw, previous) => {
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? (previous ?? 0) : parsed;
  };

  const durationErrors = slideDurationErrors(config);

  // An emptied box stays empty rather than snapping back to the old number —
  // `slideDurationErrors` flags it and the parent's Save stays disabled, so the
  // admin can clear and retype without the field fighting them.
  const setDuration = (key, raw) => {
    const parsed = parseInt(raw, 10);
    setField(key, Number.isNaN(parsed) ? '' : parsed);
  };

  // Auto is null in the UI and on the wire in; `toDeviceConfigPatch` turns it
  // into the 0 sentinel on the way out. Undefined counts as auto too — that is
  // a config stored before this field existed.
  const agendaAuto = config.agendaDurationSeconds == null;

  const setAgendaAuto = (auto) => {
    if (auto) {
      if (typeof config.agendaDurationSeconds === 'number') {
        setLastAgendaSeconds(config.agendaDurationSeconds);
      }
      setField('agendaDurationSeconds', null);
    } else {
      setField('agendaDurationSeconds', lastAgendaSeconds);
    }
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
                disabled={readOnly}
                className={INPUT_CLASS}
                placeholder="Mississauga"
              />
            </Field>
            <Field label="Country">
              <input
                type="text"
                value={location.country || ''}
                onChange={(e) => setLocationField('country', e.target.value)}
                disabled={readOnly}
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
                disabled={readOnly}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={location.longitude ?? ''}
                onChange={(e) => setLocationField('longitude', numeric(e.target.value, location.longitude))}
                disabled={readOnly}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Timezone">
              <select
                value={location.timezone || 'America/Toronto'}
                onChange={(e) => setLocationField('timezone', e.target.value)}
                disabled={readOnly}
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
                disabled={readOnly}
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
            disabled={readOnly}
          />
        </header>
      </section>

      {/* Slide timing */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Timer className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Slide Timing</h3>
            <p className="text-xs text-gray-500">How long the board holds each of these slides</p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field
            label={<>Agenda slide duration <span className="font-normal text-gray-400">(seconds)</span></>}
            error={durationErrors.agendaDurationSeconds}
            hint={
              agendaAuto
                ? `Auto - ${AGENDA_AUTO_RANGE_LABEL}.`
                : 'The agenda holds this long however many events it lists.'
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={SLIDE_DURATION_MIN_SECONDS}
                max={SLIDE_DURATION_MAX_SECONDS}
                step="1"
                inputMode="numeric"
                value={agendaAuto ? '' : config.agendaDurationSeconds}
                onChange={(e) => setDuration('agendaDurationSeconds', e.target.value)}
                disabled={readOnly || agendaAuto}
                placeholder={agendaAuto ? 'Auto' : ''}
                className={inputClass(durationErrors.agendaDurationSeconds, 'min-w-[6rem] flex-1')}
              />
              <div className="flex shrink-0 items-center gap-2">
                <Toggle
                  checked={agendaAuto}
                  onChange={setAgendaAuto}
                  label="Set the agenda slide duration automatically"
                  disabled={readOnly}
                />
                <span className="text-sm font-medium text-gray-700">Auto</span>
              </div>
            </div>
          </Field>

          <Field
            label={<>Next prayer slide duration <span className="font-normal text-gray-400">(seconds)</span></>}
            error={durationErrors.nextPrayerDurationSeconds}
            hint="How long the countdown to the next prayer stays up."
          >
            <input
              type="number"
              min={SLIDE_DURATION_MIN_SECONDS}
              max={SLIDE_DURATION_MAX_SECONDS}
              step="1"
              inputMode="numeric"
              value={config.nextPrayerDurationSeconds ?? ''}
              onChange={(e) => setDuration('nextPrayerDurationSeconds', e.target.value)}
              disabled={readOnly}
              placeholder="12"
              className={inputClass(durationErrors.nextPrayerDurationSeconds)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

/**
 * TickerEditor — the `scrollingMessages` / `enableScrollingMessage` pair.
 *
 * Lives here rather than in its own file so it keeps sharing the Toggle and
 * input styling with the config form it used to be part of; it is a separate
 * card with a separate Save because it is a separate permission.
 */
function TickerEditor({ config, onUpdate, readOnly = false }) {
  const setField = useCallback((key, value) => {
    if (!config || !onUpdate) return;
    onUpdate({ ...config, [key]: value });
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

  const messages = config.scrollingMessages || [];

  return (
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
          disabled={readOnly}
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
                disabled={readOnly}
                className={`${INPUT_CLASS} flex-1`}
                placeholder="Enter message..."
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeMessage(index)}
                  aria-label={`Remove message ${index + 1}`}
                  className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setField('scrollingMessages', [...messages, ''])}
              className="flex items-center gap-2 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Message
            </button>
          )}
        </div>
      )}
    </section>
  );
}

const MemoTickerEditor = memo(TickerEditor);
export { MemoTickerEditor as TickerEditor };

export default memo(BoardConfigEditor);
