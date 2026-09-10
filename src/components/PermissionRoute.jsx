import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Spinner } from './ui';

/**
 * Route guard that gates on permissions rather than a role name.
 *
 * Every board and admin route used to sit behind a single `isRoot()` check,
 * which is why "fix a typo on the sisters' board" and "reboot the hardware"
 * needed the same grant. Routes now ask for the narrowest permission that makes
 * the page useful at all — usually a read — and the controls inside gate
 * themselves individually.
 *
 * `anyOf` is the normal case: a page is worth opening if the user can do any one
 * of the things on it. `allOf` exists for the rare page where a partial view
 * would be misleading.
 *
 * The denial screen names the permission that is missing. "Access denied" with
 * no further detail turns into a message to whoever administers the console
 * asking what, exactly, to request.
 */
export default function PermissionRoute({ children, anyOf, allOf, label = 'this page' }) {
  const { isAuthenticated, isLoading, canAny, canAll } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteSpinner label="Checking permissions" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  const required = allOf ?? anyOf ?? [];
  const allowed = allOf ? canAll(allOf) : canAny(anyOf ?? []);
  if (allowed) return children;

  return (
    <div className="flex items-center justify-center py-16">
      <div className="anim-in w-full max-w-md bg-surface border border-line rounded-xl p-8 text-center">
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-warn-dim grid place-items-center">
          <ShieldAlert className="text-warn" size={22} strokeWidth={1.8} />
        </div>
        <h2 className="text-lg text-ink mb-2">Not permitted</h2>
        <p className="text-[13px] text-muted mb-5">
          Your account does not have access to {label}.
        </p>
        <p className="cap mb-2.5">{allOf ? 'Requires all of' : 'Requires one of'}</p>
        <div className="flex flex-wrap justify-center gap-1.5 mb-7">
          {required.map((permission) => (
            <code
              key={permission}
              className="rounded bg-raised border border-hair px-2 py-1 font-mono text-[11px] text-soft"
            >
              {permission}
            </code>
          ))}
        </div>
        <Link to="/">
          <Button variant="secondary">Back to overview</Button>
        </Link>
      </div>
    </div>
  );
}

/** Shared with ProtectedRoute so both guards look identical while resolving. */
export function RouteSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
      <Spinner size={22} />
      <p className="text-[12px]">{label}</p>
    </div>
  );
}
