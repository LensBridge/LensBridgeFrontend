import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldX } from 'lucide-react';
import AuthLayout from '../components/shell/AuthLayout';
import { Spinner } from '../components/ui';
import { api } from '../api/client';

/**
 * Lands here from the verification email.
 *
 * The call is fired once per token and guarded by a ref rather than by state:
 * StrictMode double-invokes effects in development, and the second POST would
 * consume an already-spent token and report failure for a verification that
 * actually succeeded.
 */
export default function ConfirmEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'working' : 'failed');
  const [message, setMessage] = useState(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    (async () => {
      const { data, error } = await api.POST('/api/auth/verify-email', { body: { token } });
      if (error) {
        setMessage(error.message || 'This verification link is no longer valid.');
        setState('failed');
      } else {
        setMessage(data?.message ?? null);
        setState('done');
      }
    })();
  }, [token]);

  return (
    <AuthLayout caption="Email verification" title={state === 'done' ? 'Verified' : 'Verifying'}>
      <div className="flex flex-col items-center text-center py-2">
        {state === 'working' && <Spinner size={22} className="text-muted" />}
        {state === 'done' && (
          <>
            <CheckCircle2 size={28} className="text-good mb-4" strokeWidth={1.6} />
            <p className="text-[13px] text-soft leading-relaxed">
              {message ?? 'Your email address is confirmed.'}
            </p>
            <Link to="/login" className="mt-6 text-[13px] text-ember hover:underline underline-offset-4">
              Sign in
            </Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <ShieldX size={28} className="text-bad mb-4" strokeWidth={1.6} />
            <p className="text-[13px] text-soft leading-relaxed">
              {message ?? 'This verification link is missing or no longer valid.'}
            </p>
            <Link to="/login" className="mt-6 text-[13px] text-ember hover:underline underline-offset-4">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
