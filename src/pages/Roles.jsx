import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import {
  PageHeader,
  Panel,
  Badge,
  ErrorNote,
  Skeleton,
  SearchInput,
  SegmentedControl,
} from '../components/ui';
import IamService from '../services/IamService';
import { useAuth } from '../context/AuthContext';
import {
  DOMAIN_LABELS,
  PERMISSION_DESCRIPTIONS,
  SENSITIVE_PERMISSIONS,
} from '../utils/permissions';
import { bareRoleName } from '../components/admin/roles';

const ROLE_TONE_BADGE = {
  root: 'bad',
  elevated: 'ember',
  standard: 'cool',
  readonly: 'quiet',
};

/**
 * The role and permission catalog.
 *
 * Read-only by design — roles are defined in the backend enum, not in a table,
 * so there is nothing here to edit. What this page is for is answering "what
 * would BOARD_EDITOR actually let them do", which is the question that gets
 * asked every time someone requests access, and which the grant modal on the
 * People page is much too small to answer.
 *
 * The matrix is the point. A list of roles and a list of permissions side by
 * side does not show that BOARD_ADMIN is BOARD_EDITOR plus the fleet; a grid
 * does, at a glance.
 */
export default function Roles() {
  const { permissions: held } = useAuth();

  const [roles, setRoles] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');

  useEffect(() => {
    Promise.all([IamService.listRoles(), IamService.listPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setCatalog(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  const domains = useMemo(() => {
    const found = new Set((catalog ?? []).map((p) => p.domain).filter(Boolean));
    return ['all', ...[...found].sort()];
  }, [catalog]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (catalog ?? []).filter((p) => {
      if (domain !== 'all' && p.domain !== domain) return false;
      if (!needle) return true;
      return (
        p.authority?.toLowerCase().includes(needle) ||
        p.name?.toLowerCase().includes(needle) ||
        PERMISSION_DESCRIPTIONS[p.authority]?.toLowerCase().includes(needle)
      );
    });
  }, [catalog, domain, query]);

  const heldSet = useMemo(() => new Set(held), [held]);

  if (error) {
    return (
      <>
        <PageHeader title="Roles" />
        <ErrorNote>{error}</ErrorNote>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles &amp; permissions"
        description="Roles are named bundles. Authorization on the server is always per-permission, so this table is the definitive answer to what a bundle actually confers."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {roles
          ? roles.map((role) => {
              const bare = bareRoleName(role.name);
              const tone =
                bare === 'ROOT'
                  ? 'root'
                  : bare.endsWith('_ADMIN')
                    ? 'elevated'
                    : bare.endsWith('_VIEWER') || bare.endsWith('_SCANNER')
                      ? 'readonly'
                      : 'standard';
              return (
                <div key={role.name} className="bg-surface border border-hair rounded-lg shadow-sm p-4">
                  <Badge tone={ROLE_TONE_BADGE[tone]} size="sm">
                    {bare}
                  </Badge>
                  <p className="mt-3 text-[12px] text-muted leading-relaxed min-h-[3rem]">
                    {role.description || 'No description on the server.'}
                  </p>
                  <p className="mt-2 cap">
                    {role.permissions?.length ?? 0} permission
                    {role.permissions?.length === 1 ? '' : 's'}
                  </p>
                </div>
              );
            })
          : Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-surface border border-hair rounded-lg shadow-sm p-4 space-y-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
      </div>

      <Panel
        padded={false}
        caption="Matrix"
        title="What each role confers"
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              value={domain}
              onChange={setDomain}
              options={domains.slice(0, 4).map((d) => ({
                value: d,
                label: d === 'all' ? 'All' : (DOMAIN_LABELS[d] ?? d),
              }))}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Filter permissions"
              className="w-56"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="cap text-left font-normal px-4 py-2.5 min-w-[19rem]">
                  Permission
                </th>
                {(roles ?? []).map((role) => (
                  <th
                    key={role.name}
                    scope="col"
                    className="cap font-normal px-2 py-2.5 text-center whitespace-nowrap"
                  >
                    <span className="inline-block" style={{ writingMode: 'horizontal-tb' }}>
                      {bareRoleName(role.name).replace(/_/g, ' ')}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((permission) => (
                <tr key={permission.authority} className="border-b border-hair hover:bg-raised/50">
                  <td className="px-4 py-2.5 align-top">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[12px] text-ink">{permission.authority}</code>
                      {SENSITIVE_PERMISSIONS.has(permission.authority) && (
                        <Badge tone="warn" size="sm">
                          sensitive
                        </Badge>
                      )}
                      {heldSet.has(permission.authority) && (
                        <span
                          title="You hold this permission"
                          className="w-1.5 h-1.5 rounded-full bg-ember shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-[12px] text-muted mt-0.5">
                      {PERMISSION_DESCRIPTIONS[permission.authority] ?? (
                        <span className="text-faint">No description recorded in the console.</span>
                      )}
                    </p>
                  </td>
                  {(roles ?? []).map((role) => {
                    const granted = role.permissions?.includes(permission.authority);
                    return (
                      <td key={role.name} className="px-2 py-2.5 text-center align-top">
                        {granted ? (
                          <Check size={14} className="inline text-good" strokeWidth={2.6} />
                        ) : (
                          <Minus size={12} className="inline text-line-loud" strokeWidth={2.6} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {catalog && visible.length === 0 && (
          <div className="py-10 text-center">
            <ShieldCheck size={26} className="mx-auto text-faint mb-3" strokeWidth={1.4} />
            <p className="text-[13px] text-muted">No permission matches that filter.</p>
          </div>
        )}

        {!catalog && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}
      </Panel>

      <p className="mt-4 text-[12px] text-muted">
        The ember dot marks a permission your own account holds. You cannot grant what you do not
        hold, so it is also the list of what you can hand to someone else.
      </p>
    </>
  );
}
