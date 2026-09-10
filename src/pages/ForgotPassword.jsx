import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import AuthLayout from '../components/shell/AuthLayout';
import { Button, Field, Input, ErrorNote } from '../components/ui';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await api.POST('/api/auth/forgot-password', {
        body: { email: email.trim() },
      });
      if (failure) throw new Error(failure.message || 'Could not send the reset email.');
      setSent(true);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout caption="Password reset" title="Check your inbox">
        <div className="flex flex-col items-center text-center py-2">
          <MailCheck size={28} className="text-good mb-4" strokeWidth={1.6} />
          <p className="text-[13px] text-soft leading-relaxed">
            If an account exists for{' '}
            <span className="val text-ink text-[12px]">{email}</span>, a reset link is on
            its way. The link expires, so use it soon.
          </p>
          <Link to="/login" className="mt-6 text-[13px] text-ember hover:underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      caption="Password reset"
      title="Send a reset link"
      footer={
        <Link to="/login" className="text-ember hover:underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field
          label="Email"
          htmlFor="email"
          hint="We will email a link that lets you set a new password."
        >
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" icon={Send} loading={busy} className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
