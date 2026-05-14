import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DeviceService from '../services/DeviceService';
import EnrollTokenDialog from '../components/devices/EnrollTokenDialog';

function hasRootPermissions(user) {
  return Boolean(
    user?.authorities?.some((auth) => auth.authority === 'ROLE_ROOT') ||
    user?.roles?.some((role) => role === 'ROLE_ROOT' || role === 'ROOT') ||
    user?.role === 'ROLE_ROOT'
  );
}

function EnrollDevice() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState({ displayName: '', audience: 'BOTH', expiresInMinutes: 30 });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tokenResponse, setTokenResponse] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const next = {};
    if (!form.displayName.trim()) next.displayName = 'Display name is required';
    if (form.displayName.length > 80) next.displayName = 'Display name must be 80 characters or fewer';
    if (!['BROTHERS', 'SISTERS', 'BOTH'].includes(form.audience)) next.audience = 'Choose a valid audience';
    const expires = Number(form.expiresInMinutes);
    if (!Number.isInteger(expires) || expires < 5 || expires > 1440) next.expiresInMinutes = 'Use 5 to 1440 minutes';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError('');
      const response = await DeviceService.issueEnrollmentToken({
        displayName: form.displayName.trim(),
        audience: form.audience,
        expiresInMinutes: Number(form.expiresInMinutes)
      });
      setTokenResponse(response);
    } catch (err) {
      setSubmitError(err.message || 'Failed to issue token');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !hasRootPermissions(user)) {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">ROOT access required</h2>
        <Link to="/admin/devices" className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Back to Devices</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/admin/devices" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Enroll New Device</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">Issue a one-time token for a MusallahBoard agent.</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {submitError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Display name</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Lobby board"
            />
            {errors.displayName && <span className="mt-1 block text-sm text-red-600">{errors.displayName}</span>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Audience</span>
            <select
              value={form.audience}
              onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="BOTH">Both</option>
              <option value="BROTHERS">Brothers</option>
              <option value="SISTERS">Sisters</option>
            </select>
            {errors.audience && <span className="mt-1 block text-sm text-red-600">{errors.audience}</span>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Expires in minutes</span>
            <input
              type="number"
              min="5"
              max="1440"
              value={form.expiresInMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, expiresInMinutes: Number(event.target.value) }))}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {errors.expiresInMinutes && <span className="mt-1 block text-sm text-red-600">{errors.expiresInMinutes}</span>}
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Issue Token
          </button>
        </div>
      </form>

      {tokenResponse && <EnrollTokenDialog tokenResponse={tokenResponse} onClose={() => setTokenResponse(null)} />}
    </div>
  );
}

export default EnrollDevice;
