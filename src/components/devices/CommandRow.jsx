import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Loader2 } from 'lucide-react';
import CommandOutput from './CommandOutput';
import { formatRelativeTime, TERMINAL_COMMAND_STATUSES } from '../../utils/deviceStatus';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  DELIVERED: 'bg-blue-100 text-blue-700',
  ACKED: 'bg-indigo-100 text-indigo-700',
  RUNNING: 'bg-purple-100 text-purple-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  TIMEOUT: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-700'
};

function CommandRow({ command }) {
  const [open, setOpen] = useState(false);
  const terminal = TERMINAL_COMMAND_STATUSES.has(command.status);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{command.kind}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[command.status] || STATUS_STYLES.PENDING}`}>
              {command.status}
            </span>
            {!terminal && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          {command.progress?.message && (
            <div className="mt-1 text-sm text-gray-500">{command.progress.message}</div>
          )}
        </div>
        <div className="hidden items-center gap-1 text-sm text-gray-500 sm:flex">
          <Clock className="h-4 w-4" />
          {formatRelativeTime(command.issuedAt)}
        </div>
      </button>

      {open && (
        <div className="space-y-3 bg-white px-11 pb-4">
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-3">
            <div>Issued by: {command.issuedBy || 'Unknown'}</div>
            <div>Deadline: {command.deadlineMs || 30000}ms</div>
            <div>Finished: {command.finishedAt ? formatRelativeTime(command.finishedAt) : 'Not finished'}</div>
          </div>
          <CommandOutput command={command} />
        </div>
      )}
    </div>
  );
}

export default CommandRow;
