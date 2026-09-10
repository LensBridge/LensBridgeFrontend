import { Cpu, HardDrive, MemoryStick, Network, Radio, Thermometer, Wifi } from 'lucide-react';
import ThrottleChips from './ThrottleChips';
import { formatRelativeTime } from '../../utils/deviceStatus';
import { KeyValue } from '../ui/Bits';

/**
 * A small line chart with no axes.
 *
 * Ember, because a sparkline is the one place in the console where the accent
 * carries data rather than decoration — and there is only ever one series in
 * it, so there is nothing for a second colour to distinguish.
 *
 * Samples accumulate from heartbeat frames only. Without
 * `board:telemetry:subscribe` no frames arrive, so the empty state says that
 * rather than sitting on "Waiting for data" indefinitely.
 */
function Sparkline({ samples, field, suffix = '', live = true }) {
  const values = samples
    .map((sample) => Number(sample[field]))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return (
      <div className="h-14 rounded-md bg-raised border border-hair grid place-items-center text-[11px] text-faint">
        {live ? 'Waiting for heartbeats' : 'Needs live telemetry'}
      </div>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-11 w-full">
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-baseline justify-between text-[11px] text-muted tabular mt-1">
        <span className="text-faint">
          {min}
          {suffix}
        </span>
        <span className="text-ink">
          {values.at(-1)}
          {suffix}
        </span>
        <span className="text-faint">
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

// Spelled out rather than interpolated: Tailwind scans source text for class
// names, and `text-${tone}` produces nothing at build time.
const METRIC_TONE = { ink: 'text-ink', warn: 'text-warn', bad: 'text-bad' };

function Metric({ icon: Icon, label, value, tone = 'ink' }) {
  return (
    <div className="bg-raised border border-hair rounded-md px-4 py-3">
      <div className="flex items-center gap-2 cap">
        <Icon size={12} strokeWidth={1.9} />
        {label}
      </div>
      <div className={`mt-2 font-display text-lg tabular ${METRIC_TONE[tone]}`}>{value}</div>
    </div>
  );
}

export default function TelemetryPanel({ device, samples, live = true }) {
  const telemetry = device?.telemetry || {};

  const memory =
    telemetry.memUsedMb && telemetry.memTotalMb
      ? `${telemetry.memUsedMb} / ${telemetry.memTotalMb} MB`
      : '—';

  // A Pi under a fan idles in the fifties; sustained eighties is where it starts
  // throttling, so that is where the number should start looking wrong.
  const tempTone =
    telemetry.cpuTempC == null ? 'ink' : telemetry.cpuTempC >= 80 ? 'bad' : telemetry.cpuTempC >= 70 ? 'warn' : 'ink';
  const diskTone =
    telemetry.diskUsedPct == null ? 'ink' : telemetry.diskUsedPct >= 90 ? 'bad' : telemetry.diskUsedPct >= 75 ? 'warn' : 'ink';

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Thermometer}
          label="CPU temp"
          tone={tempTone}
          value={telemetry.cpuTempC != null ? `${telemetry.cpuTempC}°C` : '—'}
        />
        <Metric icon={MemoryStick} label="Memory" value={memory} />
        <Metric
          icon={HardDrive}
          label="Disk used"
          tone={diskTone}
          value={telemetry.diskUsedPct != null ? `${telemetry.diskUsedPct}%` : '—'}
        />
        <Metric
          icon={Cpu}
          label="Uptime"
          value={telemetry.uptimeSec ? `${Math.floor(telemetry.uptimeSec / 3600)}h` : '—'}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          { label: 'CPU temperature', field: 'cpuTempC', suffix: '°' },
          { label: 'Memory used', field: 'memUsedMb', suffix: 'MB' },
          { label: 'Disk used', field: 'diskUsedPct', suffix: '%' },
        ].map((chart) => (
          <div key={chart.field} className="bg-raised border border-hair rounded-md px-4 py-3">
            <div className="cap mb-2.5">{chart.label}</div>
            <Sparkline samples={samples} field={chart.field} suffix={chart.suffix} live={live} />
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="bg-raised border border-hair rounded-md px-4 py-3">
          <div className="flex items-center gap-2 cap mb-1">
            <Network size={12} strokeWidth={1.9} />
            Network
          </div>
          <KeyValue label="Last heartbeat">{formatRelativeTime(device?.lastHeartbeat)}</KeyValue>
          <KeyValue label="SSID">
            <span className="inline-flex items-center gap-1.5">
              {telemetry.wifiSsid && <Wifi size={11} className="text-faint" />}
              {telemetry.wifiSsid}
            </span>
          </KeyValue>
          <KeyValue label="Addresses" mono>
            {(telemetry.ipv4 || [device?.lastSeenIp]).filter(Boolean).join(', ') || null}
          </KeyValue>
        </div>

        <div className="bg-raised border border-hair rounded-md px-4 py-3">
          <div className="flex items-center gap-2 cap mb-1">
            <Radio size={12} strokeWidth={1.9} />
            Runtime
          </div>
          <KeyValue label="Kiosk alive">
            {telemetry.kioskAlive == null ? null : telemetry.kioskAlive ? 'Yes' : 'No'}
          </KeyValue>
          {/* Agents report displayedFrameKey. displayedFrameId is the pre-rename
              name, kept only for agents that predate the change. */}
          <KeyValue label="Displayed frame" mono>
            {telemetry.displayedFrameKey || telemetry.displayedFrameId}
          </KeyValue>
          <KeyValue label="Throttle">
            <ThrottleChips value={telemetry.throttleFlags} />
          </KeyValue>
        </div>
      </div>
    </div>
  );
}
