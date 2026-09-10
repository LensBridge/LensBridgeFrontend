import Spinner from './Spinner';
import EmptyState from './EmptyState';

/**
 * The console's table.
 *
 * Designed to sit inside a `<Panel padded={false}>`, which is why it carries
 * its own horizontal padding rather than inheriting a card's: the header rule
 * and the row rules have to run the full width of the card or the table looks
 * like it is floating inside a box slightly too big for it.
 *
 * Rows are tight. This is a tool someone opens every day to find one line in
 * forty, and generous row padding is a cost paid on every scan.
 *
 * The header is sticky, which is new and is the reason the table now lives in
 * a card with its own scroll container: on the audit log — 50 rows a page —
 * losing the column names three rows in was the single most common complaint
 * about the old page.
 *
 * Columns are `{ key, header, render?, width?, align?, className? }`. Loading
 * renders skeleton rows at the real column widths so the layout does not jump
 * when data lands — the table is usually the tallest thing on the page and a
 * jump there moves everything below it.
 */
export default function DataTable({
  columns,
  rows,
  loading,
  empty,
  rowKey = (row, i) => row.id ?? row.uuid ?? i,
  onRowClick,
  skeletonRows = 6,
  className = '',
}) {
  const cols = columns.filter(Boolean);
  const pad = (i, n) => `${i === 0 ? 'pl-4' : 'pl-0'} ${i === n - 1 ? 'pr-4' : 'pr-4'}`;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={[
                  'cap text-left font-medium whitespace-nowrap align-middle',
                  'sticky top-0 z-[1] bg-surface py-2.5 border-b border-hair',
                  pad(i, cols.length),
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '',
                ].join(' ')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, r) => (
                <tr key={r} className="border-b border-hair last:border-0">
                  {cols.map((c, i) => (
                    <td key={c.key} className={`py-3 ${pad(i, cols.length)}`}>
                      <div
                        className="shimmer h-3 rounded-xs bg-raised"
                        style={{ width: `${45 + ((r * 13 + c.key.length * 7) % 45)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, r) => (
                <tr
                  key={rowKey(row, r)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ '--i': Math.min(r, 12) }}
                  className={[
                    'anim-stagger border-b border-hair last:border-0 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-surface-2' : '',
                  ].join(' ')}
                >
                  {cols.map((c, i) => (
                    <td
                      key={c.key}
                      className={[
                        'py-2.5 align-middle',
                        pad(i, cols.length),
                        c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '',
                        c.className ?? 'text-soft',
                      ].join(' ')}
                    >
                      {c.render ? c.render(row, r) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {!loading && rows.length === 0 && (
        <div>{empty ?? <EmptyState title="Nothing here yet" compact />}</div>
      )}
    </div>
  );
}

/** Inline spinner row for tables that refresh in place. */
export function TableBusy({ label = 'Refreshing' }) {
  return (
    <div className="flex items-center gap-2 py-2 cap">
      <Spinner size={11} />
      {label}
    </div>
  );
}
