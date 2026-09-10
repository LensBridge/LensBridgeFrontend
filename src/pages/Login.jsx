import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '../components/shell/AuthLayout';
import { Button, Field, Input, ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // A stale error from a previous attempt should not greet the next visit.
  useEffect(() => () => clearError(), [clearError]);

  // Send people back where they were headed when the guard intercepted them.
  const destination = location.state?.from?.pathname ?? '/';

  if (!isLoading && isAuthenticated) return <Navigate to={destination} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(form.email.trim(), form.password);
    setSubmitting(false);
    if (result?.success) navigate(destination, { replace: true });
  };

  return (
    <AuthLayout
      caption="Sign in"
      title="Assalamu Alaikum"
      footer={
        <>
          <Link to="/forgot-password" className="text-ember hover:underline underline-offset-4">
            Forgot your password?
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@utoronto.ca"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={LogIn}
          loading={submitting}
          className="w-full"
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
