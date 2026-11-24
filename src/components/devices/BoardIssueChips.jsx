import { boardIssues } from '../../utils/boardState';

const STYLES = {
  danger: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200',
  info: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200'
};

/** What needs attention on a board, as small chips. Nothing when all is well. */
function BoardIssueChips({ board, reportAt = null, empty = null }) {
  const issues = boardIssues(board, { reportAt });
  if (!issues.length) return empty;
  return (
    <div className="flex flex-wrap gap-1.5">
      {issues.map((issue) => (
        <span
          key={issue.label}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[issue.level]}`}
        >
          {issue.label}
        </span>
      ))}
    </div>
  );
}

export default BoardIssueChips;
