import { useMemo, useState } from 'react';
import { Lock, Minus, Plus, ShieldAlert } from 'lucide-react';
import { Modal, Button, Badge, Tabs, ErrorNote, SearchInput, KeyValue } from '../ui';
import {
  DOMAIN_LABELS,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_NAMES,
  SENSITIVE_PERMISSIONS,
} from '../../utils/permissions';
import { bareRoleName, canAssignRole } from './roles';

const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);
const domainRank = (d) => {
  const i = DOMAIN_ORDER.indexOf(d);
  return i === -1 ? DOMAIN_ORDER.length : i;
};

/**
 * Everything one account is allowed to do, in one place.
 *
 * Roles and direct grants used to be two separate modals reached from two
 * separate menu items, which meant the answer to "why does this person have
 * telemetry access" lived in whichever one you had not opened. They are tabs
 * here, over a shared header that states the effective total.
 *
 * The distinction the permissions tab exists to draw is **effective vs direct**.
 * Someone holds `board:poster:write` either because BOARD_EDITOR carries it or
 * because it was granted to them specifically, and only the second is revocable
 * here. Without the split, an operator tries to revoke a role-derived permission
 * and gets a server error that reads like a bug.
 *
 * Rows the current operator cannot act on still render when the target holds
 * the permission — "this account has telemetry access and I cannot take it
 * away" is information they need. What is hidden is the control, not the fact.
 * The server enforces all of this regardless; every refusal it sends back is
 * shown verbatim, because those messages name the rule that was broken.
 */
export default function AccessEditor({
  open,
  onClose,
  user,
  roles,
  permissions,
  heldPermissions,
  onSetRole,
  onSetPermission,
}) {
  const [tab, setTab] = useState('roles');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const effective = useMemo(
    () => new Set(user?.effectivePermissions ?? []),
    [user?.effectivePermissions]
  );
  const direct = useMemo(() => new Set(user?.directPermissions ?? []), [user?.directPermissions]);
  const held = useMemo(() => new Set(heldPermissions), [heldPermissions]);
  const userRoles = useMemo(
    () => new Set((user?.roles ?? []).map(bareRoleName)),
    [user?.roles]
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byDomain = new Map();
    for (const permission of permissions ?? []) {
      // Only permissions the target already holds, or the operator could hand
      // over, are actionable or informative. The rest would be dead rows.
      if (!effective.has(permission.authority) && !held.has(permission.authority)) continue;
      if (needle && !permission.authority?.toLowerCase().includes(needle)) continue;
      const domain = permission.domain ?? 'other';
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(permission);
    }
    return [...byDomain.entries()].sort(([a], [b]) => domainRank(a) - domainRank(b));
  }, [permissions, effective, held, query]);

  const roleDerived = effective.size - direct.size;

  const run = async (key, action) => {
    setPending(key);
    setOutcome(null);
    const result = await action();
    setPending(null);
    setOutcome(result);
  };

  if (!user) return null;

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      caption="Access"
      title={name}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-raised border border-hair rounded-md px-3.5 py-2.5">
          <div className="cap">Effective</div>
          <div className="font-display text-xl text-ink mt-1 tabular">{effective.size}</div>
        </div>
        <div className="bg-raised border border-hair rounded-md px-3.5 py-2.5">
          <div className="cap">From roles</div>
          <div className="font-display text-xl text-soft mt-1 tabular">{Math.max(0, roleDerived)}</div>
        </div>
        <div className="bg-raised border border-hair rounded-md px-3.5 py-2.5">
          <div className="cap">Direct</div>
          <div className="font-display text-xl text-ember mt-1 tabular">{direct.size}</div>
        </div>
      </div>

      {outcome && (
        <div className="mb-4">
          {outcome.ok ? (
            <div className="bg-good-dim/50 border border-good/30 rounded-md px-3.5 py-2.5 text-[13px] text-ink">
              {outcome.message}
            </div>
          ) : (
            <ErrorNote>{outcome.message}</ErrorNote>
          )}
        </div>
      )}

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'roles', label: 'Roles', count: userRoles.size },
          { id: 'permissions', label: 'Direct grants', count: direct.size },
        ]}
      />

      {tab === 'roles' && (
        <div className="space-y-2">
          {(roles ?? []).map((role) => {
            const bare = bareRoleName(role.name);
            const assigned = userRoles.has(bare);
            const allowed = canAssignRole(role, heldPermissions);
            const busy = pending === `role:${bare}`;

            return (
              <div
                key={role.name}
                className={`flex items-start gap-4 border rounded-md px-4 py-3 ${
                  assigned ? 'border-line bg-raised/60' : 'border-hair'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[12px] text-ink">{bare}</code>
                    {assigned && (
                      <Badge tone="good" size="sm">
                        assigned
                      </Badge>
                    )}
                    {bare === 'ROOT' && (
                      <Badge tone="bad" size="sm" icon={ShieldAlert}>
                        apex
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">
                    {role.description || 'No description on the server.'}
                  </p>
                  <p className="text-[11px] text-faint mt-1">
                    {role.permissions?.length ?? 0} permissions
                    {!allowed && ' · includes permissions you do not hold'}
                  </p>
                </div>

                {allowed ? (
                  <Button
                    size="sm"
                    variant={assigned ? 'ghost' : 'secondary'}
                    icon={assigned ? Minus : Plus}
                    loading={busy}
                    onClick={() =>
                      run(`role:${bare}`, () => onSetRole(bare, assigned ? 'remove' : 'add'))
                    }
                  >
                    {assigned ? 'Remove' : 'Assign'}
                  </Button>
                ) : (
                  <span
                    title="You cannot hand out a bundle containing permissions you do not hold."
                    className="text-faint mt-1.5 shrink-0"
                  >
                    <Lock size={14} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'permissions' && (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Filter by authority"
            className="mb-4"
          />

          {groups.length === 0 ? (
            <p className="text-[13px] text-muted py-6 text-center">
              Nothing to show. You can only grant permissions you hold yourself, and this account
              holds none that you do not.
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map(([domain, list]) => (
                <div key={domain}>
                  <p className="cap mb-2">{DOMAIN_LABELS[domain] ?? domain}</p>
                  <div className="space-y-1.5">
                    {list.map((permission) => {
                      const authority = permission.authority;
                      const isDirect = direct.has(authority);
                      const isEffective = effective.has(authority);
                      const canAct = held.has(authority);
                      const enumName = permission.name ?? PERMISSION_NAMES[authority];
                      const busy = pending === `perm:${authority}`;

                      return (
                        <div
                          key={authority}
                          className="flex items-start gap-4 border border-hair rounded-md px-3.5 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <code className="font-mono text-[12px] text-ink">{authority}</code>
                              {isDirect ? (
                                <Badge tone="ember" size="sm">
                                  direct
                                </Badge>
                              ) : isEffective ? (
                                <Badge tone="quiet" size="sm">
                                  via role
                                </Badge>
                              ) : null}
                              {SENSITIVE_PERMISSIONS.has(authority) && (
                                <Badge tone="warn" size="sm">
                                  sensitive
                                </Badge>
                              )}
                            </div>
                            {PERMISSION_DESCRIPTIONS[authority] && (
                              <p className="text-[11px] text-muted mt-0.5">
                                {PERMISSION_DESCRIPTIONS[authority]}
                              </p>
                            )}
                          </div>

                          {isEffective && !isDirect ? (
                            <span
                              title="Comes from a role bundle. Remove the role to take it away."
                              className="text-faint mt-1 shrink-0"
                            >
                              <Lock size={13} />
                            </span>
                          ) : canAct ? (
                            <Button
                              size="xs"
                              variant={isDirect ? 'ghost' : 'secondary'}
                              icon={isDirect ? Minus : Plus}
                              loading={busy}
                              onClick={() =>
                                run(`perm:${authority}`, () => onSetPermission(enumName, !isDirect))
                              }
                            >
                              {isDirect ? 'Revoke' : 'Grant'}
                            </Button>
                          ) : (
                            <span className="text-faint mt-1 shrink-0" title="You do not hold this permission.">
                              <Lock size={13} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 pt-4 border-t border-hair">
        <KeyValue label="User id" mono>
          {user.id}
        </KeyValue>
        <KeyValue label="Email" mono>
          {user.email}
        </KeyValue>
      </div>
    </Modal>
  );
}
