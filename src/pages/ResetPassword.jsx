import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, ShieldX } from 'lucide-react';
import AuthLayout from '../components/shell/AuthLayout';
import { Button, Field, Input, ErrorNote, Spinner } from '../components/ui';
import { api } from '../api/client';

/** Same floor the server enforces; checked here so the failure is instant. */
const MIN_LENGTH = 8;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const [tokenState, setTokenState] = useState(token ? 'checking' : 'invalid');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      const { error: failure } = await api.POST('/api/auth/validate-reset-token', {
        body: { token },
      });
      if (!alive) return;
      setTokenState(failure ? 'invalid' : 'valid');
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const problem = useMemo(() => {
    if (form.password && form.password.length < MIN_LENGTH)
      return `At least ${MIN_LENGTH} characters.`;
    if (form.confirm && form.password !== form.confirm) return 'The two entries do not match.';
    return null;
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await api.POST('/api/auth/reset-password', {
        body: { token, newPassword: form.password },
      });
      if (failure) throw new Error(failure.message || 'Could not set the new password.');
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (tokenState === 'checking') {
    return (
      <AuthLayout caption="Password reset" title="Checking the link">
        <div className="flex justify-center py-6 text-muted">
          <Spinner size={22} />
        </div>
      </AuthLayout>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <AuthLayout caption="Password reset" title="That link will not work">
        <div className="flex flex-col items-center text-center py-2">
          <ShieldX size={28} className="text-bad mb-4" strokeWidth={1.6} />
          <p className="text-[13px] text-soft leading-relaxed">
            Reset links expire and can only be used once. Ask for a fresh one and use it straight
            away.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 text-[13px] text-ember hover:underline underline-offset-4"
          >
            Send another link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout caption="Password reset" title="Password changed">
        <div className="flex flex-col items-center text-center py-2">
          <CheckCircle2 size={28} className="text-good mb-4" strokeWidth={1.6} />
          <p className="text-[13px] text-soft">Taking you to sign in.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout caption="Password reset" title="Set a new password">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="New password" htmlFor="password" hint={`At least ${MIN_LENGTH} characters.`}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </Field>
        <Field label="Confirm" htmlFor="confirm" error={problem}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            error={problem}
          />
        </Field>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={KeyRound}
          loading={busy}
          disabled={!!problem || !form.password}
          className="w-full"
        >
          Set password
        </Button>
      </form>
    </AuthLayout>
  );
}
