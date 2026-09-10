import { memo, useCallback, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  AGENDA_AUTO_RANGE_LABEL,
  CALCULATION_METHODS,
  DEFAULT_AGENDA_DURATION_SECONDS,
  SLIDE_DURATION_MAX_SECONDS,
  SLIDE_DURATION_MIN_SECONDS,
  TIMEZONES,
  slideDurationErrors,
} from '../../models/board';
import { Button, Field, Input, Select, Switch } from '../ui';

/**
 * One device's DeviceConfig, minus the ticker.
 *
 * The fields here are exactly the ones `UpdateBoardConfigRequest` accepts:
 * location, darkModeAfterIsha, agendaDurationSeconds, nextPrayerDurationSeconds.
 * Anything else is dropped server-side without an error, so adding a control for
 * a field the backend does not have produces a setting that silently never
 * applies — which is how poster-cycle and refresh-after-Isha lingered here.
 *
 * `socialUrl` used to be here too, as a "Stay Connected QR" section. It is gone
 * from DeviceConfig, from the request DTO and from the database. The QR
 * destination is no longer one value per board: it lives on each
 * PromotableSocialMedia record, which is what lets a single board promote
 * several accounts. Those are edited on the Socials tab.
 *
 * The scrolling ticker is `TickerEditor` below: its own sub-resource under
 * `board:ticker:write`, which a BOARD_EDITOR holds without holding
 * `board:config:write`. One shared form would mean one Save the editor could
 * never press.
 *
 * Fully controlled: the parent owns `config` and receives every edit.
 */
function BoardConfigEditor({ config, onUpdate, readOnly = false }) {
  const setField = useCallback(
    (key, value) => {
      if (!config || !onUpdate) return;
      onUpdate({ ...config, [key]: value });
    },
    [config, onUpdate]
  );

  const setLocationField = useCallback(
    (key, value) => {
      if (!config || !onUpdate) return;
      onUpdate({ ...config, location: { ...(config.location || {}), [key]: value } });
    },
    [config, onUpdate]
  );

  // Turning Auto off has to put *some* number in the box. Remember the one the
  // admin last typed so a mis-click on the toggle is undoable.
  const [lastAgendaSeconds, setLastAgendaSeconds] = useState(
    typeof config?.agendaDurationSeconds === 'number' && config.agendaDurationSeconds > 0
      ? config.agendaDurationSeconds
      : DEFAULT_AGENDA_DURATION_SECONDS
  );

  if (!config) return null;

  const location = config.location || {};
  const durationErrors = slideDurationErrors(config);

  // Latitude/longitude are doubles server-side; an empty input must not become
  // NaN, so fall back to the previous value while the field is mid-edit.
  const numeric = (raw, previous) => {
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? (previous ?? 0) : parsed;
  };

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
    <div className="space-y-7">
      <section>
        <p className="cap mb-1">Location &amp; prayer times</p>
        <p className="text-[12px] text-muted mb-4 leading-relaxed max-w-xl">
          The board computes prayer times itself from these coordinates. There is no server-side
          prayer source, so a wrong timezone here puts wrong times on the screen and nothing else
          will catch it.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <Input
              value={location.city || ''}
              placeholder="Mississauga"
              disabled={readOnly}
              onChange={(e) => setLocationField('city', e.target.value)}
            />
          </Field>
          <Field label="Country">
            <Input
              value={location.country || ''}
              placeholder="Canada"
              disabled={readOnly}
              onChange={(e) => setLocationField('country', e.target.value)}
            />
          </Field>
          <Field label="Latitude">
            <Input
              type="number"
              step="0.0001"
              value={location.latitude ?? ''}
              disabled={readOnly}
              onChange={(e) =>
                setLocationField('latitude', numeric(e.target.value, location.latitude))
              }
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="0.0001"
              value={location.longitude ?? ''}
              disabled={readOnly}
              onChange={(e) =>
                setLocationField('longitude', numeric(e.target.value, location.longitude))
              }
            />
          </Field>
          <Field label="Timezone">
            <Select
              value={location.timezone || 'America/Toronto'}
              disabled={readOnly}
              onChange={(e) => setLocationField('timezone', e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('America/', '')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Calculation method">
            <Select
              value={location.method || 'ISNA'}
              disabled={readOnly}
              onChange={(e) => setLocationField('method', e.target.value)}
            >
              {CALCULATION_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="pt-5 border-t border-hair">
        <p className="cap mb-4">Night mode</p>
        <Switch
          checked={!!config.darkModeAfterIsha}
          onChange={(v) => setField('darkModeAfterIsha', v)}
          disabled={readOnly}
          label="Dim the board after Isha"
          hint="The screen sits in a prayer room overnight. This drops it to the dark theme rather than leaving a bright panel lighting the space."
        />
      </section>

      <section className="pt-5 border-t border-hair">
        <p className="cap mb-1">Slide timing</p>
        <p className="text-[12px] text-muted mb-4">
          How long the board holds each of these slides. Between{' '}
          {SLIDE_DURATION_MIN_SECONDS} and {SLIDE_DURATION_MAX_SECONDS} seconds.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Agenda slide (seconds)"
            error={durationErrors.agendaDurationSeconds}
            hint={
              agendaAuto
                ? `Auto — ${AGENDA_AUTO_RANGE_LABEL}.`
                : 'The agenda holds this long however many events it lists.'
            }
          >
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={SLIDE_DURATION_MIN_SECONDS}
                max={SLIDE_DURATION_MAX_SECONDS}
                step="1"
                inputMode="numeric"
                className="flex-1 min-w-[6rem]"
                value={agendaAuto ? '' : config.agendaDurationSeconds}
                placeholder={agendaAuto ? 'Auto' : ''}
                error={durationErrors.agendaDurationSeconds}
                disabled={readOnly || agendaAuto}
                onChange={(e) => setDuration('agendaDurationSeconds', e.target.value)}
              />
              <Switch
                checked={agendaAuto}
                onChange={setAgendaAuto}
                disabled={readOnly}
                label="Auto"
              />
            </div>
          </Field>

          <Field
            label="Next prayer slide (seconds)"
            error={durationErrors.nextPrayerDurationSeconds}
            hint="How long the countdown to the next prayer stays up."
          >
            <Input
              type="number"
              min={SLIDE_DURATION_MIN_SECONDS}
              max={SLIDE_DURATION_MAX_SECONDS}
              step="1"
              inputMode="numeric"
              placeholder="12"
              value={config.nextPrayerDurationSeconds ?? ''}
              error={durationErrors.nextPrayerDurationSeconds}
              disabled={readOnly}
              onChange={(e) => setDuration('nextPrayerDurationSeconds', e.target.value)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

/**
 * The `scrollingMessages` / `enableScrollingMessage` pair.
 *
 * Lives in this file rather than its own so it keeps sharing the config form's
 * shape and vocabulary; it is a separate panel with a separate Save because it
 * is a separate permission.
 */
function TickerEditor({ config, onUpdate, readOnly = false }) {
  const setField = useCallback(
    (key, value) => {
      if (!config || !onUpdate) return;
      onUpdate({ ...config, [key]: value });
    },
    [config, onUpdate]
  );

  const setMessage = useCallback(
    (index, value) => {
      const messages = [...(config.scrollingMessages || [])];
      messages[index] = value;
      setField('scrollingMessages', messages);
    },
    [config, setField]
  );

  if (!config) return null;

  const messages = config.scrollingMessages || [];

  return (
    <div className="space-y-4">
      <Switch
        checked={!!config.enableScrollingMessage}
        onChange={(v) => setField('enableScrollingMessage', v)}
        disabled={readOnly}
        label="Show the ticker"
        hint="Messages cycle along the bottom of this board."
      />

      {config.enableScrollingMessage && (
        <div className="space-y-2 pt-1">
          {messages.length === 0 && (
            <p className="text-[13px] text-muted">
              No messages — the ticker stays hidden until you add one.
            </p>
          )}

          {messages.map((message, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={message}
                placeholder="Something worth reading twice"
                disabled={readOnly}
                onChange={(e) => setMessage(index, e.target.value)}
              />
              {!readOnly && (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  aria-label={`Remove message ${index + 1}`}
                  className="shrink-0 text-faint hover:text-bad"
                  onClick={() =>
                    setField(
                      'scrollingMessages',
                      messages.filter((_, i) => i !== index)
                    )
                  }
                />
              )}
            </div>
          ))}

          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              icon={Plus}
              onClick={() => setField('scrollingMessages', [...messages, ''])}
            >
              Add message
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const MemoTickerEditor = memo(TickerEditor);
export { MemoTickerEditor as TickerEditor };

export default memo(BoardConfigEditor);
