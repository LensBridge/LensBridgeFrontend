import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

/**
 * Create a user from the admin console.
 *
 * The failure that actually happens here is a collision: `createUser` rejects a
 * duplicate email *or* student number with one message naming both. That used to
 * surface as a toast at the top of the dashboard while the modal closed itself
 * and discarded what had been typed. It stays open now and renders the server's
 * message next to the form, because re-entering four fields to find out which one
 * collided is the whole cost of the mistake.
 *
 * Field limits mirror `SignupRequest`'s column caps. The endpoint takes
 * `@RequestBody` without `@Valid`, so nothing else about the shape is enforced
 * server-side and nothing else is enforced here either — an operator creating an
 * account with an off-pattern address is doing it deliberately.
 */

const LIMITS = { firstName: 20, lastName: 20, email: 50, studentNumber: 10 };
const EMPTY = { firstName: '', lastName: '', email: '', studentNumber: '' };

function Field({ id, label, value, onChange, type = 'text', placeholder, maxLength, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
}

function CreateUserModal({ onSubmit, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const complete = Object.values(form).every((v) => v.trim().length > 0);

  const submit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    const result = await onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      studentNumber: form.studentNumber.trim(),
    });
    setSubmitting(false);
    if (result.ok) onClose();
    else setError(result.message);
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field
            id="create-user-first-name"
            label="First Name"
            value={form.firstName}
            onChange={set('firstName')}
            maxLength={LIMITS.firstName}
            placeholder="Enter first name"
            autoFocus
          />
          <Field
            id="create-user-last-name"
            label="Last Name"
            value={form.lastName}
            onChange={set('lastName')}
            maxLength={LIMITS.lastName}
            placeholder="Enter last name"
          />
          <Field
            id="create-user-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={set('email')}
            maxLength={LIMITS.email}
            placeholder="Enter email address"
          />
          <Field
            id="create-user-student-number"
            label="Student Number"
            value={form.studentNumber}
            onChange={set('studentNumber')}
            maxLength={LIMITS.studentNumber}
            placeholder="Enter student number"
          />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The user account will be created in a disabled state. The user must reset their password via the &quot;Forgot Password&quot; link to activate their account.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!complete || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
