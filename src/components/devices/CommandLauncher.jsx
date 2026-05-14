import { createElement, useState } from 'react';
import { Camera, FileText, Loader2, MoreHorizontal, Power, RefreshCcw, RotateCw, ServerCog } from 'lucide-react';
import DeviceService from '../../services/DeviceService';

const QUICK_COMMANDS = [
  { kind: 'chrome.reload', label: 'Reload Chrome', icon: RotateCw, confirm: false },
  { kind: 'config.refresh', label: 'Refresh Config', icon: RefreshCcw, confirm: false },
  { kind: 'chrome.screenshot', label: 'Screenshot', icon: Camera, confirm: false },
  { kind: 'kiosk.restart', label: 'Restart Kiosk', icon: ServerCog, confirm: true },
  { kind: 'system.reboot', label: 'Reboot Device', icon: Power, confirm: true }
];

function CommandLauncher({ deviceId, onIssued, disabled }) {
  const [submitting, setSubmitting] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [lines, setLines] = useState(100);
  const [error, setError] = useState('');

  const issue = async (kind, payload = {}, confirmCommand = false) => {
    if (confirmCommand && !confirm(`Issue ${kind} to this device?`)) return;

    try {
      setError('');
      setSubmitting(kind);
      const issued = await DeviceService.issueCommand(deviceId, {
        kind,
        payload,
        deadlineMs: kind === 'logs.tail' ? 45000 : 30000
      });
      onIssued?.(issued);
      setShowLogs(false);
    } catch (err) {
      setError(err.message || 'Failed to issue command');
    } finally {
      setSubmitting('');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((command) => (
          <button
            key={command.kind}
            type="button"
            disabled={disabled || Boolean(submitting)}
            onClick={() => issue(command.kind, {}, command.confirm)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting === command.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : createElement(command.icon, { className: 'h-4 w-4' })}
            {command.label}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled || Boolean(submitting)}
          onClick={() => setShowLogs(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          Tail Logs
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Tail device logs</h3>
            <p className="mt-1 text-sm text-gray-500">Request the latest journal lines from the agent. The backend clamps this between 1 and 500.</p>
            <label className="mt-5 block text-sm font-medium text-gray-700">
              Lines
              <input
                type="number"
                min="1"
                max="500"
                value={lines}
                onChange={(event) => setLines(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => issue('logs.tail', { lines: Math.min(500, Math.max(1, lines || 100)) })}
                disabled={Boolean(submitting)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting === 'logs.tail' && <Loader2 className="h-4 w-4 animate-spin" />}
                Issue Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandLauncher;
