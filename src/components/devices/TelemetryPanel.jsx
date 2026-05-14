import { createElement } from 'react';
import { Cpu, HardDrive, MemoryStick, Network, Radio, Thermometer, Wifi } from 'lucide-react';
import ThrottleChips from './ThrottleChips';
import { formatRelativeTime } from '../../utils/deviceStatus';

function MiniSparkline({ samples, field, suffix = '' }) {
  const values = samples
    .map((sample) => Number(sample[field]))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return <div className="h-12 rounded bg-gray-50 text-xs text-gray-400 flex items-center justify-center">Waiting for data</div>;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / range) * 30;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-12">
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-full w-full">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500" />
      </svg>
      <div className="text-[11px] text-gray-500">{values.at(-1)}{suffix}</div>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {createElement(icon, { className: 'h-4 w-4' })}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function TelemetryPanel({ device, samples }) {
  const telemetry = device?.telemetry || {};
  const memValue = telemetry.memUsedMb && telemetry.memTotalMb
    ? `${telemetry.memUsedMb} / ${telemetry.memTotalMb} MB`
    : 'Unknown';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Thermometer} label="CPU Temp" value={telemetry.cpuTempC ? `${telemetry.cpuTempC} C` : 'Unknown'} />
        <Metric icon={MemoryStick} label="Memory" value={memValue} />
        <Metric icon={HardDrive} label="Disk Used" value={telemetry.diskUsedPct != null ? `${telemetry.diskUsedPct}%` : 'Unknown'} />
        <Metric icon={Cpu} label="Uptime" value={telemetry.uptimeSec ? `${Math.floor(telemetry.uptimeSec / 3600)}h` : 'Unknown'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">CPU temperature</div>
          <MiniSparkline samples={samples} field="cpuTempC" suffix=" C" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Memory used</div>
          <MiniSparkline samples={samples} field="memUsedMb" suffix=" MB" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Disk used</div>
          <MiniSparkline samples={samples} field="diskUsedPct" suffix="%" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Network className="h-4 w-4 text-indigo-500" />
            Network
          </div>
          <div className="text-sm text-gray-600">Last heartbeat: {formatRelativeTime(device?.lastHeartbeat)}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wifi className="h-4 w-4" />
            {telemetry.wifiSsid || 'Unknown SSID'}
          </div>
          <div className="text-sm text-gray-600">IP: {(telemetry.ipv4 || [device?.lastSeenIp]).filter(Boolean).join(', ') || 'Unknown'}</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Radio className="h-4 w-4 text-indigo-500" />
            Runtime
          </div>
          <div className="text-sm text-gray-600">Kiosk alive: {telemetry.kioskAlive == null ? 'Unknown' : telemetry.kioskAlive ? 'Yes' : 'No'}</div>
          <div className="text-sm text-gray-600">Displayed frame: {telemetry.displayedFrameId || 'Unknown'}</div>
          <ThrottleChips value={telemetry.throttleFlags} />
        </div>
      </div>
    </div>
  );
}

export default TelemetryPanel;
