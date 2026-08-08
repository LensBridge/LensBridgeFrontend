import { useAuth } from '../context/AuthContext';

/**
 * Renders its children only if the current user holds the permission.
 *
 * The house style is to hide what the user cannot use rather than disable it, so
 * there is no `fallback` by default — an unauthorized control leaves no trace.
 * Pass `fallback` only where the absence would leave a confusing hole, e.g. a
 * card whose entire body is a single gated action.
 *
 *   <Can permission={PERMISSIONS.BOARD_POSTER_WRITE}>
 *     <button onClick={createPoster}>New poster</button>
 *   </Can>
 *
 * This is presentation. The server rejects the call regardless; hiding the
 * button only stops us offering an action that was always going to 403.
 */
function Can({ permission, anyOf, allOf, fallback = null, children }) {
  const { can, canAny, canAll } = useAuth();

  let allowed = false;
  if (permission) allowed = can(permission);
  else if (allOf) allowed = canAll(allOf);
  else if (anyOf) allowed = canAny(anyOf);

  if (!allowed) return fallback;
  return children;
}

export default Can;
