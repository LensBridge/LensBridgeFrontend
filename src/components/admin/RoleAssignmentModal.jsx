import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { PERMISSION_DESCRIPTIONS, SENSITIVE_PERMISSIONS } from '../../utils/permissions';
import { bareRoleName } from './roles';

/**
 * Add or remove one role bundle on one user.
 *
 * `GET /api/admin/roles` carries each bundle's description and permission set,
 * and both are rendered here: "BOARD_ADMIN" on its own tells an operator
 * nothing about whether they are handing over the reboot button.
 *
 * `options` is already filtered by the caller to bundles the current user could
 * legitimately assign — the server refuses the rest anyway (§6.5), and offering
 * them would only produce a rejection the operator has to interpret.
 */
function RoleAssignmentModal({ mode, targetUser, options, onSubmit, onClose }) {
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const removing = mode === 'remove';
  const definition = useMemo(
    () => options.find((role) => role.name === selected) ?? null,
    [options, selected]
  );

  const submit = async () => {
    setSubmitting(true);
    setResult(await onSubmit(selected));
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {removing ? 'Remove Role from User' : 'Add Role to User'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>User:</strong> {targetUser.firstName} {targetUser.lastName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Email:</strong> {targetUser.email}
            </p>
          </div>

          {options.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              {removing
                ? 'This user holds no role you are able to remove. Removing a bundle requires holding every permission in it.'
                : 'There is no role you are able to assign. Granting a bundle requires holding every permission in it.'}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {removing ? 'Select Role to Remove' : 'Select Role'}
              </label>
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setResult(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a role</option>
                {options.map((role) => (
                  <option key={role.name} value={role.name}>
                    {bareRoleName(role.name)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {definition && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">{definition.description}</p>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {removing ? 'Permissions this takes away' : 'Permissions this grants'}
                  {' '}({definition.permissions?.length ?? 0})
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {(definition.permissions ?? []).map((authority) => (
                    <div key={authority} className="flex items-start gap-2 text-xs">
                      {SENSITIVE_PERMISSIONS.has(authority) ? (
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <span className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <code className="font-mono text-gray-800">{authority}</code>
                        {PERMISSION_DESCRIPTIONS[authority] && (
                          <span className="text-gray-500"> — {PERMISSION_DESCRIPTIONS[authority]}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div
            className={`border rounded-lg p-3 ${
              removing ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <p className={`text-sm ${removing ? 'text-red-800' : 'text-yellow-800'}`}>
              <strong>Warning:</strong>{' '}
              {removing
                ? 'The user keeps any of these permissions that another role or a direct grant still provides.'
                : 'Every permission listed above becomes effective immediately.'}
            </p>
          </div>

          {result && (
            <div
              className={`border rounded-lg p-3 flex items-start gap-2 text-sm ${
                result.ok
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {!result.ok && <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={!selected || submitting}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              removing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {removing ? 'Remove Role' : 'Add Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleAssignmentModal;
