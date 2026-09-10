import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import CommandOutput from './CommandOutput';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { formatRelativeTime, TERMINAL_COMMAND_STATUSES } from '../../utils/deviceStatus';

/**
 * Status tones. Everything before a terminal state is neutral-to-cool: an
 * in-flight command is not news. Only the outcomes get colour, so scanning the
 * list finds what failed rather than what is happening.
 */
const STATUS_TONE = {
  PENDING: 'quiet',
  DELIVERED: 'cool',
  ACKED: 'cool',
  RUNNING: 'cool',
  SUCCEEDED: 'good',
  FAILED: 'bad',
  TIMEOUT: 'warn',
  REJECTED: 'bad',
  EXPIRED: 'quiet',
};

export default function CommandRow({ command }) {
  const [open, setOpen] = useState(false);
  const terminal = TERMINAL_COMMAND_STATUSES.has(command.status);

  return (
    <div className="border-b border-hair last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-raised/60 transition-colors"
      >
        {open ? (
          <ChevronDown size={14} className="text-faint shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-faint shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] text-ink">{command.kind}</span>
            <Badge tone={STATUS_TONE[command.status] ?? 'quiet'} size="sm">
              {command.status}
            </Badge>
            {!terminal && <Spinner size={12} className="text-muted" />}
          </div>
          {command.progress?.message && (
            <p className="mt-1 text-[12px] text-muted">{command.progress.message}</p>
          )}
        </div>

        <span className="hidden sm:flex items-center gap-1.5 text-[12px] text-muted tabular shrink-0">
          <Clock size={12} className="text-faint" />
          {formatRelativeTime(command.issuedAt)}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 pl-12 space-y-3">
          <div className="grid gap-1.5 sm:grid-cols-3 text-[12px] text-muted">
            <span>
              Issued by <span className="text-soft">{command.issuedBy || 'unknown'}</span>
            </span>
            <span>
              Deadline <span className="text-soft tabular">{command.deadlineMs || 30000}ms</span>
            </span>
            <span>
              Finished{' '}
              <span className="text-soft">
                {command.finishedAt ? formatRelativeTime(command.finishedAt) : 'not yet'}
              </span>
            </span>
          </div>
          <CommandOutput command={command} />
        </div>
      )}
    </div>
  );
}
