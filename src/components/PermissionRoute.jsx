import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard that gates on permissions rather than a role name.
 *
 * Every board and admin route used to sit behind a single `isRoot()` check,
 * which is why "fix a typo on the sisters' board" and "reboot the hardware"
 * needed the same grant. Routes now ask for the narrowest permission that makes
 * the page useful at all — usually a read permission — and the controls inside
 * gate themselves individually.
 *
 * `anyOf` is the normal case: a page is worth opening if the user can do any one
 * of the things on it. `allOf` exists for the rare page where a partial view
 * would be misleading.
 *
 * The denial screen names the permission the user is missing, because "Access
 * Denied" with no further detail turns into a message to whoever administers the
 * console asking what to request.
 */
function PermissionRoute({ children, anyOf, allOf, label = 'this page' }) {
  const { isAuthenticated, isLoading, canAny, canAll } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const required = allOf ?? anyOf ?? [];
  const allowed = allOf ? canAll(allOf) : canAny(anyOf ?? []);

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">Not permitted</h2>
          <p className="mb-4 text-gray-600">
            Your account doesn&apos;t have access to {label}.
          </p>
          <p className="mb-2 text-sm text-gray-500">
            {allOf ? 'Requires all of:' : 'Requires one of:'}
          </p>
          <div className="mb-6 flex flex-wrap justify-center gap-1.5">
            {required.map((permission) => (
              <code
                key={permission}
                className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700"
              >
                {permission}
              </code>
            ))}
          </div>
          <Link
            to="/"
            className="inline-flex items-center rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default PermissionRoute;
