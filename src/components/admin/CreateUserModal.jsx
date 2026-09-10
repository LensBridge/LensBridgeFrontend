import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal, Button, Field, Input, Select, Switch, ErrorNote } from '../ui';

/**
 * Create a user from the console.
 *
 * The failure that actually happens here is a collision: the server rejects a
 * duplicate email with a message naming it. That used to surface as a toast
 * while the modal closed and discarded what had been typed. It stays open now
 * and renders the server's message beside the form, because re-entering four
 * fields to find out which one collided is the whole cost of the mistake.
 *
 * Two creation modes, and the default is the safe one. Omitting a password
 * creates the account disabled and emails a reset link — nobody handles a
 * secret, and the account only becomes usable once its owner sets one. Supplying
 * a password creates an account that works immediately, which is occasionally
 * what you want (a shared scanner login before an event) and is otherwise a way
 * to end up sending a password over Discord.
 *
 * Field limits mirror the column caps. The endpoint takes `@RequestBody` without
 * `@Valid`, so nothing else about the shape is enforced server-side and nothing
 * else is enforced here either — an operator creating an account with an
 * off-pattern address is doing it deliberately.
 */
const LIMITS = { firstName: 20, lastName: 20, email: 50 };
const EMPTY = { firstName: '', lastName: '', email: '', audience: '', password: '' };

export default function CreateUserModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [setPasswordNow, setSetPasswordNow] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const complete =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.audience &&
    (!setPasswordNow || form.password.length >= 8);

  const close = () => {
    setForm(EMPTY);
    setSetPasswordNow(false);
    setError(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    const result = await onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      audience: form.audience,
      ...(setPasswordNow ? { password: form.password } : {}),
    });
    setSubmitting(false);
    if (result.ok) close();
    else setError(result.message);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      caption="Access"
      title="Create an account"
      dismissable={!submitting}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={submit}
            loading={submitting}
            disabled={!complete}
          >
            Create account
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="cu-first" required>
            <Input
              id="cu-first"
              autoFocus
              maxLength={LIMITS.firstName}
              value={form.firstName}
              onChange={(e) => set('firstName')(e.target.value)}
            />
          </Field>
          <Field label="Last name" htmlFor="cu-last" required>
            <Input
              id="cu-last"
              maxLength={LIMITS.lastName}
              value={form.lastName}
              onChange={(e) => set('lastName')(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="cu-email" required hint="Also the sign-in identity. It cannot be changed later from the console.">
          <Input
            id="cu-email"
            type="email"
            maxLength={LIMITS.email}
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
          />
        </Field>

        <Field
          label="Audience"
          htmlFor="cu-audience"
          required
          hint="Decides which board content this account sees in the app."
        >
          <Select
            id="cu-audience"
            value={form.audience}
            onChange={(e) => set('audience')(e.target.value)}
          >
            <option value="">Choose one</option>
            <option value="brothers">Brothers</option>
            <option value="sisters">Sisters</option>
            <option value="both">Both</option>
          </Select>
        </Field>

        <div className="pt-1 border-t border-hair">
          <div className="pt-4">
            <Switch
              checked={setPasswordNow}
              onChange={setSetPasswordNow}
              label="Set a password now"
              hint="Off: the account is created disabled and a reset link is emailed. On: it works immediately and no email is sent — you become responsible for handing over the secret."
            />
          </div>

          {setPasswordNow && (
            <div className="mt-4">
              <Field
                label="Password"
                htmlFor="cu-password"
                required
                hint="At least 8 characters."
              >
                <Input
                  id="cu-password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.password}
                  onChange={(e) => set('password')(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        <p className="text-[12px] text-muted leading-relaxed">
          New accounts carry no grants. Give the account what it needs from the access editor once
          it exists.
        </p>
      </form>
    </Modal>
  );
}
