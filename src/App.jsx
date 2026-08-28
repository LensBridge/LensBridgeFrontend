import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, TooltipProvider, Spinner } from './components/ui';
import ConsoleLayout from './components/shell/ConsoleLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import { PERMISSIONS } from './utils/permissions';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmEmail from './pages/ConfirmEmail';

/**
 * Console routes load on demand.
 *
 * Radix added roughly 56KB gzipped to a single bundle that already sat past
 * Vite's size warning. Nobody opens all eleven of these in a session -- a
 * BOARD_EDITOR may never open any of the access pages -- so the editors and
 * their dependencies (the QR library, the STOMP client) should not be in the
 * first paint. The four auth screens stay eager: they are what a signed-out
 * visitor sees first, and a spinner before the login box is a bad trade.
 */
const Overview = lazy(() => import('./pages/Overview'));
const BoardContent = lazy(() => import('./pages/BoardContent'));
const Displays = lazy(() => import('./pages/Displays'));
const DisplayDetail = lazy(() => import('./pages/DisplayDetail'));
const PrayerSpaces = lazy(() => import('./pages/PrayerSpaces'));
const MediaQueue = lazy(() => import('./pages/MediaQueue'));
const People = lazy(() => import('./pages/People'));
const Roles = lazy(() => import('./pages/Roles'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));


/**
 * The Minbar management console.
 *
 * Two frames and nothing else: `AuthLayout` for the four screens you can reach
 * signed out, `ConsoleLayout` for everything else. There is no public surface —
 * no gallery, no submission form, no marketing pages. Accounts are created by
 * an administrator, which is why `/signup` is gone rather than hidden.
 *
 * Route gates repeat the permission lists that `components/shell/nav.js` uses
 * to build the sidebar. That duplication is deliberate: hiding a link is not
 * authorization, and someone with a bookmark reaches the route directly.
 *
 * Each gate asks for the narrowest permission that makes the page worth
 * opening — a read, in every case. The controls inside gate themselves; see
 * `utils/permissions.js`.
 */
/** Holds the layout's shape while a route chunk arrives, so nothing jumps. */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-ground flex items-center justify-center">
      <Spinner size={20} className="text-muted" />
    </div>
  );
}

/**
 * Where the chosen theme is remembered.
 *
 * `index.html` reads this same key in a blocking script before first paint, so
 * the two must not drift — a rename here without one there costs you a white
 * flash on every load in dark mode, and nothing else, which is exactly the kind
 * of bug that ships.
 */
const THEME_STORAGE_KEY = 'minbar-theme';

export default function App() {
  return (
    /*
      `attribute="class"` to match the `dark` variant in index.css, and
      `disableTransitionOnChange` because roughly every surface in this console
      carries a colour transition for its hover state: without it, flipping the
      theme animates all of them at once and the whole page wipes over 150ms
      instead of switching.
    */
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
    <AuthProvider>
      <ToastProvider>
        <TooltipProvider delayDuration={250}>
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<ConfirmEmail />} />

            <Route
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <ConsoleLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />

              <Route
                path="board/content"
                element={
                  <PermissionRoute
                    anyOf={[
                      PERMISSIONS.BOARD_CONTENT_READ,
                      PERMISSIONS.BOARD_POSTER_WRITE,
                      PERMISSIONS.BOARD_EVENT_WRITE,
                      PERMISSIONS.BOARD_WEEKLY_WRITE,
                      PERMISSIONS.BOARD_SOCIAL_WRITE,
                    ]}
                    label="board content"
                  >
                    <BoardContent />
                  </PermissionRoute>
                }
              />
              <Route
                path="board/displays"
                element={
                  <PermissionRoute
                    anyOf={[PERMISSIONS.BOARD_DEVICE_READ, PERMISSIONS.BOARD_CONFIG_READ]}
                    label="the display fleet"
                  >
                    <Displays />
                  </PermissionRoute>
                }
              />
              <Route
                path="board/displays/:deviceId"
                element={
                  <PermissionRoute
                    anyOf={[PERMISSIONS.BOARD_DEVICE_READ, PERMISSIONS.BOARD_CONFIG_READ]}
                    label="display details"
                  >
                    <DisplayDetail />
                  </PermissionRoute>
                }
              />
              <Route
                path="board/spaces"
                element={
                  <PermissionRoute
                    anyOf={[PERMISSIONS.BOARD_CONTENT_READ, PERMISSIONS.BOARD_PRAYER_SPACE_WRITE]}
                    label="prayer spaces"
                  >
                    <PrayerSpaces />
                  </PermissionRoute>
                }
              />

              <Route
                path="media"
                element={
                  <PermissionRoute
                    anyOf={[PERMISSIONS.MEDIA_UPLOAD_READ, PERMISSIONS.MEDIA_UPLOAD_MODERATE]}
                    label="media submissions"
                  >
                    <MediaQueue />
                  </PermissionRoute>
                }
              />

              <Route
                path="access/people"
                element={
                  <PermissionRoute
                    anyOf={[
                      PERMISSIONS.IAM_USER_READ,
                      PERMISSIONS.IAM_USER_WRITE,
                      PERMISSIONS.IAM_ROLE_GRANT,
                    ]}
                    label="the people directory"
                  >
                    <People />
                  </PermissionRoute>
                }
              />
              <Route
                path="access/roles"
                element={
                  <PermissionRoute
                    anyOf={[PERMISSIONS.IAM_USER_READ, PERMISSIONS.IAM_ROLE_GRANT]}
                    label="the role catalog"
                  >
                    <Roles />
                  </PermissionRoute>
                }
              />
              <Route
                path="access/audit"
                element={
                  <PermissionRoute anyOf={[PERMISSIONS.AUDIT_READ]} label="the audit log">
                    <AuditLog />
                  </PermissionRoute>
                }
              />

              <Route path="account" element={<Account />} />

              {/* Paths from the previous app, kept so live bookmarks land somewhere. */}
              <Route path="admin" element={<Navigate to="/media" replace />} />
              <Route path="admin/board" element={<Navigate to="/board/content" replace />} />
              <Route path="admin/devices" element={<Navigate to="/board/displays" replace />} />
              <Route path="profile" element={<Navigate to="/account" replace />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
        </TooltipProvider>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
