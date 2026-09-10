import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Save, ShieldCheck } from 'lucide-react';
import {
  PageHeader,
  Panel,
  Button,
  Field,
  Input,
  Badge,
  KeyValue,
  ErrorNote,
  ConfirmDialog,
  useToast,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { bareRoleName } from '../components/admin/roles';
import { DOMAIN_LABELS, PERMISSION_DESCRIPTIONS } from '../utils/permissions';

const MIN_LENGTH = 8;

/**
 * Your own account: name, password, sessions, and the grants you actually hold.
 *
 * The grants list is the useful half. When someone finds a control missing, the
 * first question is always "what do I have", and until now the only way to
 * answer it was to ask an administrator to read it back. The list groups by
 * domain because that is how the permission names are structured and how people
 * describe what they are missing ("I have no board stuff").
 */
export default function Account() {
  const { user, updateUser, logoutAllDevices, isRoot } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ firstName: '', lastName: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  useEffect(() => {
    setProfile({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' });
  }, [user]);

  const dirty =
    profile.firstName !== (user?.firstName ?? '') || profile.lastName !== (user?.lastName ?? '');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data, error } = await api.PATCH('/api/user/profile', {
        body: { firstName: profile.firstName.trim(), lastName: profile.lastName.trim() },
      });
      if (error) throw new Error(error.message || 'Could not save your name.');
      // Merge rather than replace: the stored session carries permissions the
      // profile response does not, and dropping them would blank the whole nav.
      updateUser({ ...user, ...data });
      toast.success('Name updated.');
    } catch (e2) {
      toast.error('Could not save your name.', { detail: e2.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordProblem = useMemo(() => {
    if (password.next && password.next.length < MIN_LENGTH)
      return `At least ${MIN_LENGTH} characters.`;
    if (password.confirm && password.next !== password.confirm)
      return 'The two entries do not match.';
    return null;
  }, [password]);

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordProblem) return;
    setSavingPassword(true);
    setPasswordError(null);
    try {
      const { error } = await api.POST('/api/auth/change-password', {
        body: { currentPassword: password.current, newPassword: password.next },
      });
      if (error) throw new Error(error.message || 'Could not change your password.');
      setPassword({ current: '', next: '', confirm: '' });
      toast.success('Password changed.');
    } catch (e2) {
      setPasswordError(e2.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const signOutEverywhere = async () => {
    await logoutAllDevices();
    navigate('/login', { replace: true });
  };

  /** Grants grouped by the `domain:` prefix of each authority. */
  const grantsByDomain = useMemo(() => {
    const groups = new Map();
    for (const authority of user?.effectivePermissions ?? user?.permissions ?? []) {
      const domain = String(authority).split(':')[0];
      if (!groups.has(domain)) groups.set(domain, []);
      groups.get(domain).push(authority);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [user]);

  const directGrants = new Set(user?.directPermissions ?? []);

  return (
    <>
      <PageHeader title="Your account" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Panel caption="Profile" title="Name">
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="firstName">
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </Field>
                <Field label="Last name" htmlFor="lastName">
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Email" hint="Your email is your sign-in identity and cannot be changed here.">
                <Input type="email" value={user?.email ?? ''} disabled />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  icon={Save}
                  loading={savingProfile}
                  disabled={!dirty}
                >
                  Save
                </Button>
              </div>
            </form>
          </Panel>

          <Panel caption="Security" title="Change password" id="password">
            <form onSubmit={changePassword} className="space-y-4">
              {passwordError && <ErrorNote>{passwordError}</ErrorNote>}
              <Field label="Current password" htmlFor="current">
                <Input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password.current}
                  onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="next" hint={`At least ${MIN_LENGTH} characters.`}>
                  <Input
                    id="next"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password.next}
                    onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))}
                  />
                </Field>
                <Field label="Confirm" htmlFor="confirm" error={passwordProblem}>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    error={passwordProblem}
                    value={password.confirm}
                    onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  icon={KeyRound}
                  loading={savingPassword}
                  disabled={!!passwordProblem || !password.current || !password.next}
                >
                  Change password
                </Button>
              </div>
            </form>
          </Panel>

          <Panel caption="Security" title="Sessions">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[13px] text-muted max-w-md leading-relaxed">
                Signs out every browser and device holding a refresh token for this account,
                including this one. Use it if you signed in somewhere you no longer control.
              </p>
              <Button variant="danger" icon={LogOut} onClick={() => setSignOutAllOpen(true)}>
                Sign out everywhere
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel caption="Identity" title="Who you are">
            <KeyValue label="Name">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || null}
            </KeyValue>
            <KeyValue label="Email" mono>
              {user?.email}
            </KeyValue>
            <KeyValue label="User id" mono>
              {user?.id}
            </KeyValue>
            <KeyValue label="Verified">
              {user?.verified ? (
                <Badge tone="good" size="sm" icon={ShieldCheck}>
                  Verified
                </Badge>
              ) : (
                <Badge tone="warn" size="sm">
                  Unverified
                </Badge>
              )}
            </KeyValue>
            <KeyValue label="Roles">
              <span className="flex flex-wrap justify-end gap-1">
                {(user?.roles ?? []).map((role) => (
                  <Badge key={role} tone={isRoot() && bareRoleName(role) === 'ROOT' ? 'ember' : 'quiet'} size="sm">
                    {bareRoleName(role)}
                  </Badge>
                ))}
              </span>
            </KeyValue>
          </Panel>

          <Panel caption="Authorization" title="What you can do" padded={false}>
            {grantsByDomain.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-muted">
                No permissions on this account yet.
              </p>
            ) : (
              <div className="divide-y divide-hair">
                {grantsByDomain.map(([domain, list]) => (
                  <div key={domain} className="px-5 py-3.5">
                    <p className="cap mb-2">{DOMAIN_LABELS[domain] ?? domain}</p>
                    <ul className="space-y-2">
                      {list.map((authority) => (
                        <li key={authority}>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-[11px] text-ink">{authority}</code>
                            {directGrants.has(authority) && (
                              <Badge tone="cool" size="sm">
                                direct
                              </Badge>
                            )}
                          </div>
                          {PERMISSION_DESCRIPTIONS[authority] && (
                            <p className="text-[11px] text-muted mt-0.5">
                              {PERMISSION_DESCRIPTIONS[authority]}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <p className="text-[12px] text-muted leading-relaxed">
            A <span className="text-cool">direct</span> grant was given to you individually. The
            rest come from a role bundle, and taking the role away takes them with it.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={signOutAllOpen}
        onClose={() => setSignOutAllOpen(false)}
        onConfirm={signOutEverywhere}
        title="Sign out everywhere?"
        confirmLabel="Sign out everywhere"
        body="Every refresh token for this account is revoked, including the one this browser is using. You will be sent back to the sign-in screen."
      />
    </>
  );
}
