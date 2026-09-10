import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, RotateCw, ScrollText } from 'lucide-react';
import {
  PageHeader,
  Panel,
  DataTable,
  Badge,
  Button,
  Select,
  Input,
  Field,
  Pagination,
  EmptyState,
  ErrorNote,
  Modal,
  KeyValue,
  SegmentedControl,
} from '../components/ui';
import AuditService from '../services/AuditService';
import {
  AUDIT_TONE_BADGE,
  AUDIT_ENTITY_LABELS,
  auditActionTone,
  describeAction,
} from '../components/admin/audit';
import { formatDateTime, formatRelativeTime } from '../utils/deviceStatus';

const PAGE_SIZE = 25;

/** `datetime-local` value -> the ISO instant the range endpoints want. */
function toInstant(local) {
  if (!local) return undefined;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * The audit log.
 *
 * The server exposes each filter as its own endpoint rather than as query
 * parameters on one, and they do not compose — a date range ignores the action
 * filter, "failed only" ignores both. Rather than pretend otherwise with a row
 * of checkboxes that silently override each other, the scope is a single
 * mutually-exclusive choice, and picking one clears the others.
 *
 * This page does not auto-refresh. Reading the log is itself an audited action,
 * so a polling dashboard would fill the log with records of itself.
 */
export default function AuditLog() {
  const [scope, setScope] = useState('all');
  const [action, setAction] = useState('');
  const [range, setRange] = useState({ start: '', end: '' });

  const [actions, setActions] = useState([]);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    AuditService.listActions().then(setActions).catch(() => setActions([]));
  }, []);

  const filter = useMemo(() => {
    if (scope === 'failed') return { failedOnly: true };
    if (scope === 'action') return { action: action || undefined };
    if (scope === 'range') {
      const start = toInstant(range.start);
      const end = toInstant(range.end);
      return start && end ? { start, end } : {};
    }
    return {};
  }, [scope, action, range]);

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        setResult(await AuditService.query({ ...filter, page: targetPage, size: PAGE_SIZE }));
      } catch (e) {
        setError(e.message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [filter, page]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  // Any change of scope invalidates the page cursor; staying on page 7 of a
  // filter that now returns four rows shows an empty table for no reason.
  const changeScope = (next) => {
    setScope(next);
    setPage(0);
  };

  const rows = result?.content ?? [];

  const columns = [
    {
      key: 'timestamp',
      header: 'When',
      width: '11rem',
      render: (row) => (
        <span title={formatDateTime(row.timestamp)} className="text-[12px] text-muted tabular">
          {formatRelativeTime(row.timestamp)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '13rem',
      render: (row) => (
        <Badge tone={AUDIT_TONE_BADGE[auditActionTone(row.action)]} size="sm">
          {describeAction(row.action)}
        </Badge>
      ),
    },
    {
      key: 'adminName',
      header: 'By',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-[13px] text-ink truncate">{row.adminName || 'System'}</p>
          <p className="val text-[11px] text-faint truncate">{row.adminEmail}</p>
        </div>
      ),
    },
    {
      key: 'targetEntityType',
      header: 'Target',
      width: '7rem',
      render: (row) =>
        row.targetEntityType ? (
          <span className="text-[12px] text-soft">
            {AUDIT_ENTITY_LABELS[row.targetEntityType] ?? row.targetEntityType}
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) => (
        <span className="text-[12px] text-muted line-clamp-1 break-all">{row.details || '—'}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every privileged action the server recorded, newest first. Reading this page is itself logged, which is why it does not refresh on its own."
        actions={
          <Button icon={RotateCw} onClick={() => load(page)} loading={loading}>
            Reload
          </Button>
        }
      />

      <Panel
        className="mb-5"
        caption="Scope"
        title="Filter"
        actions={
          <SegmentedControl
            value={scope}
            onChange={changeScope}
            options={[
              { value: 'all', label: 'Everything' },
              { value: 'action', label: 'By action' },
              { value: 'failed', label: 'Failures' },
              { value: 'range', label: 'Date range' },
            ]}
          />
        }
      >
        {scope === 'all' && (
          <p className="text-[13px] text-muted">
            Showing every recorded action. Narrow it down with one of the scopes above — the server
            applies exactly one at a time.
          </p>
        )}

        {scope === 'action' && (
          <Field label="Action type" hint="Sourced from the server, so a newly added action appears here without a redeploy.">
            <Select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              className="max-w-sm"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {describeAction(a)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {scope === 'failed' && (
          <div className="flex items-start gap-2.5 text-[13px] text-soft">
            <AlertOctagon size={15} className="text-warn mt-0.5 shrink-0" />
            <p>
              Operations the server rejected or that threw. A run of these against one account is
              usually someone hitting a permission wall, not an attack — but a run against many
              accounts is worth reading closely.
            </p>
          </div>
        )}

        {scope === 'range' && (
          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <Field label="From">
              <Input
                type="datetime-local"
                value={range.start}
                onChange={(e) => {
                  setRange((r) => ({ ...r, start: e.target.value }));
                  setPage(0);
                }}
              />
            </Field>
            <Field label="To" hint={!toInstant(range.start) || !toInstant(range.end) ? 'Both ends are required.' : undefined}>
              <Input
                type="datetime-local"
                value={range.end}
                onChange={(e) => {
                  setRange((r) => ({ ...r, end: e.target.value }));
                  setPage(0);
                }}
              />
            </Field>
          </div>
        )}
      </Panel>

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={() => load(page)}>{error}</ErrorNote>
        </div>
      )}

      <Panel
        padded={false}
        caption={result ? `${result.totalElements} entries` : 'Loading'}
        title="Recorded actions"
        footer={
          result && (
            <Pagination
              page={result.page}
              size={result.size}
              totalPages={result.totalPages}
              totalElements={result.totalElements}
              onChange={setPage}
            />
          )
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={setDetail}
          skeletonRows={8}
          empty={
            <EmptyState
              icon={scope === 'failed' ? AlertOctagon : ScrollText}
              title={scope === 'failed' ? 'No failures recorded' : 'Nothing matched'}
              body={
                scope === 'range'
                  ? 'Pick a window that both ends actually fall inside — the filter needs a start and an end.'
                  : 'Widen the scope, or wait for something to happen.'
              }
            />
          }
        />
      </Panel>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        caption={detail ? formatDateTime(detail.timestamp) : ''}
        title={detail ? describeAction(detail.action) : ''}
      >
        {detail && (
          <div className="space-y-4">
            <div>
              <KeyValue label="Action">
                <span className="font-mono text-[12px]">{detail.action}</span>
              </KeyValue>
              <KeyValue label="Performed by">{detail.adminName || 'System'}</KeyValue>
              <KeyValue label="Email" mono>
                {detail.adminEmail}
              </KeyValue>
              <KeyValue label="Admin id" mono>
                {detail.adminId}
              </KeyValue>
              <KeyValue label="Target type">
                {detail.targetEntityType
                  ? (AUDIT_ENTITY_LABELS[detail.targetEntityType] ?? detail.targetEntityType)
                  : null}
              </KeyValue>
              <KeyValue label="Target id" mono>
                {detail.targetEntityId}
              </KeyValue>
              <KeyValue label="IP address" mono>
                {detail.ipAddress}
              </KeyValue>
            </div>

            {detail.details && (
              <div>
                <p className="cap mb-2">Details</p>
                <pre className="bg-raised border border-hair rounded-md px-3.5 py-3 text-[12px] font-mono text-soft leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
                  {detail.details}
                </pre>
              </div>
            )}

            {detail.userAgent && (
              <div>
                <p className="cap mb-2">User agent</p>
                <p className="text-[11px] font-mono text-muted break-all leading-relaxed">
                  {detail.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
