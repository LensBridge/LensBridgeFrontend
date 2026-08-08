import { useMemo, useState } from 'react';
import { AlertTriangle, Lock, Minus, Plus, ShieldAlert, X } from 'lucide-react';
import {
  DOMAIN_LABELS,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_NAMES,
  SENSITIVE_PERMISSIONS,
} from '../../utils/permissions';

const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);

function domainRank(domain) {
  const index = DOMAIN_ORDER.indexOf(domain);
  return index === -1 ? DOMAIN_ORDER.length : index;
}

/**
 * Direct permission grants for one user.
 *
 * The distinction this panel exists to draw is effective vs direct. A user holds
 * `board:poster:write` either because BOARD_EDITOR carries it or because someone
 * granted it to them specifically, and only the second is revocable here —
 * without the split an operator tries to revoke a role-derived permission and
 * gets an error that reads like a bug.
 *
 * Rows the current user cannot act on still render when the target holds the
 * permission, because "this account has telemetry access and I can't take it
 * away" is information the operator needs. What is hidden is the control, not
 * the fact.
 */
function PermissionGrantPanel({ targetUser, permissions, heldPermissions, onGrant, onRevoke, onClose }) {
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);

  const effective = useMemo(
    () => new Set(targetUser.effectivePermissions ?? []),
    [targetUser.effectivePermissions]
  );
  const direct = useMemo(
    () => new Set(targetUser.directPermissions ?? []),
    [targetUser.directPermissions]
  );
  const held = useMemo(() => new Set(heldPermissions), [heldPermissions]);

  const groups = useMemo(() => {
    const byDomain = new Map();
    for (const permission of permissions) {
      // Only permissions the target already holds or the caller could hand over
      // are actionable or informative; the rest would be a wall of dead rows.
      if (!effective.has(permission.authority) && !held.has(permission.authority)) continue;
      const domain = permission.domain ?? 'other';
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push(permission);
    }
    return [...byDomain.entries()].sort(([a], [b]) => domainRank(a) - domainRank(b));
  }, [permissions, effective, held]);

  const roleDerivedCount = effective.size - direct.size;

  const act = async (permission, revoke) => {
    const name = permission.name ?? PERMISSION_NAMES[permission.authority];
    setPending(permission.authority);
    setResult(await (revoke ? onRevoke(name) : onGrant(name)));
    setPending(null);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Direct Permissions</h3>
            <p className="text-sm text-gray-500">
              {targetUser.firstName} {targetUser.lastName} · {targetUser.email}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-px bg-gray-200 border-b border-gray-200">
          <div className="bg-white px-6 py-3">
            <div className="text-2xl font-bold text-gray-900">{effective.size}</div>
            <div className="text-xs text-gray-500">Effective</div>
          </div>
          <div className="bg-white px-6 py-3">
            <div className="text-2xl font-bold text-gray-900">{roleDerivedCount}</div>
            <div className="text-xs text-gray-500">From roles</div>
          </div>
          <div className="bg-white px-6 py-3">
            <div className="text-2xl font-bold text-indigo-600">{direct.size}</div>
            <div className="text-xs text-gray-500">Direct grants</div>
          </div>
        </div>

        {result && (
          <div
            className={`m-6 mb-0 border rounded-lg p-3 flex items-start gap-2 text-sm ${
              result.ok
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {!result.ok && <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {groups.length === 0 && (
            <p className="text-sm text-gray-500">
              You hold no permission this user is missing, and they hold none you can see.
            </p>
          )}

          {groups.map(([domain, entries]) => (
            <div key={domain}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {DOMAIN_LABELS[domain] ?? domain}
              </h4>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {entries.map((permission) => {
                  const authority = permission.authority;
                  const isDirect = direct.has(authority);
                  const isEffective = effective.has(authority);
                  const grantable = held.has(authority);

                  return (
                    <div
                      key={authority}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="font-mono text-sm text-gray-900">{authority}</code>
                          {isDirect ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Direct grant
                            </span>
                          ) : isEffective ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              From role
                            </span>
                          ) : null}
                          {SENSITIVE_PERMISSIONS.has(authority) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Sensitive
                            </span>
                          )}
                        </div>
                        {PERMISSION_DESCRIPTIONS[authority] && (
                          <p className="text-xs text-gray-500 mt-1">
                            {PERMISSION_DESCRIPTIONS[authority]}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {isDirect && grantable ? (
                          <button
                            onClick={() => act(permission, true)}
                            disabled={pending === authority}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                            Revoke
                          </button>
                        ) : !isEffective ? (
                          <button
                            onClick={() => act(permission, false)}
                            disabled={pending === authority}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                            Grant
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Lock className="h-3 w-3" />
                            {isDirect ? 'You do not hold this' : 'Not revocable here'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PermissionGrantPanel;
