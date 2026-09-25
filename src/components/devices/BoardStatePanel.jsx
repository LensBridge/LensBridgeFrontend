import { AlertTriangle, CheckCircle2, Clock, Download, Film, History, LayoutTemplate, RefreshCcw } from 'lucide-react';
import { createElement } from 'react';
import BoardIssueChips from './BoardIssueChips';
import {
  contentDays,
  contentSource,
  describeAgentUpdate,
  describeClock,
  describeContent,
  describeUpdates,
  updateCheckProblem
} from '../../utils/boardState';
import { formatRelativeTime } from '../../utils/deviceStatus';

const TEXT = {
  ok: 'text-gray-900',
  warning: 'text-amber-800',
  danger: 'text-red-700'
};

function Row({ icon, label, children, hint, level = 'ok' }) {
  return (
    <div className="flex gap-3">
      {createElement(icon, { className: `mt-0.5 h-4 w-4 flex-shrink-0 ${level === 'ok' ? 'text-gray-400' : TEXT[level]}` })}
      <div className="min-w-0">
        <div className="text-sm text-gray-500">{label}</div>
        <div className={`mt-0.5 font-medium ${TEXT[level]}`}>{children}</div>
        {hint && <div className="mt-0.5 text-sm text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

/**
 * What the board runs and shows, from the report it sends with every heartbeat
 * (agent 0.3.0 and later): the admin's view of a board nobody is standing in
 * front of.
 */
function BoardStatePanel({ device }) {
  const board = device.board;
  if (!board) {
    return (
      <p className="text-sm text-gray-500">
        This board has not reported what it shows yet. Boards report it from agent 0.3.0 on.
      </p>
    );
  }

  const content = board.content;
  const days = contentDays(content);
  const contentLevel = board.error || !content || days.staleDays > 0 ? 'danger' : days.daysRemaining <= 2 ? 'warning' : 'ok';
  const updates = describeUpdates(board.updates);
  const checkProblem = updateCheckProblem(board.updates);
  const agentUpdate = describeAgentUpdate(board.lastAgentUpdate);
  const clock = describeClock(board.clock);

  return (
    <div className="space-y-5">
      <BoardIssueChips board={board} reportAt={device.boardReportAt} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Row icon={LayoutTemplate} label="Board app">{board.appVersion || 'Not installed'}</Row>
        <Row
          icon={Film}
          label="Content"
          level={contentLevel}
          hint={board.error || [contentSource(content), content?.installedAt && `installed ${formatRelativeTime(content.installedAt)}`].filter(Boolean).join(', ')}
        >
          {describeContent(content)}
        </Row>
        <Row
          icon={Download}
          label="Waiting to install"
          level={checkProblem && !updates ? 'warning' : 'ok'}
          hint={updates && !board.updates?.installing ? 'Update Now, under Commands, installs it straight away.' : null}
        >
          {updates || checkProblem || 'Nothing: the board app and agent are up to date'}
        </Row>
        {agentUpdate && (
          <Row
            icon={History}
            label="Last agent update"
            level={agentUpdate.level === 'ok' ? 'ok' : agentUpdate.level}
            hint={board.lastAgentUpdate?.at ? formatRelativeTime(board.lastAgentUpdate.at) : null}
          >
            {agentUpdate.text}
          </Row>
        )}
        {clock && (
          <Row
            icon={Clock}
            label="Clock"
            level={clock.level}
            hint={clock.level === 'danger' ? 'Connect the board to the internet, fit an RTC, or send it an update from a laptop.' : null}
          >
            {clock.text}
          </Row>
        )}
        <Row
          icon={board.syncError ? AlertTriangle : RefreshCcw}
          label="Content sync"
          level={board.syncError ? 'warning' : 'ok'}
        >
          {board.syncError ? `Failing: ${board.syncError}` : 'Working'}
        </Row>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Reported by the board {formatRelativeTime(device.boardReportAt)}
      </p>
    </div>
  );
}

export default BoardStatePanel;
