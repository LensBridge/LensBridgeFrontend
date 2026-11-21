import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Loader2, Monitor } from 'lucide-react';
import DeviceService from '../services/DeviceService';
import UsbStickDownloads from '../components/devices/UsbStickDownloads';
import { CALCULATION_METHODS, TIMEZONES } from '../models/board';

const input = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

/** Empty or a number in range; anything else is an error message. */
function coordinateError(value, limit, name) {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? null : `${name} must be between -${limit} and ${limit}`;
}

/**
 * "Add board": creates the board before it is ever switched on, then offers
 * its setup file and USB kit. Offline is the default; the board only needs its
 * stick. Location fields left blank keep the server's defaults and can be
 * edited later on the board's page.
 */
function AddBoard() {
  const [form, setForm] = useState({
    displayName: '', audience: 'BOTH',
    city: '', latitude: '', longitude: '', timezone: 'America/Toronto', method: 'ISNA',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState(null);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.displayName.trim()) next.displayName = 'A name is required';
    if (form.displayName.length > 255) next.displayName = 'At most 255 characters';
    const lat = coordinateError(form.latitude, 90, 'Latitude');
    const lon = coordinateError(form.longitude, 180, 'Longitude');
    if (lat) next.latitude = lat;
    if (lon) next.longitude = lon;
    if ((form.latitude === '') !== (form.longitude === '')) next.longitude = 'Give both coordinates, or neither';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const location = {
      city: form.city.trim() || undefined,
      latitude: form.latitude === '' ? undefined : Number(form.latitude),
      longitude: form.longitude === '' ? undefined : Number(form.longitude),
      timezone: form.timezone || undefined,
      method: form.method || undefined,
    };
    try {
      setSubmitting(true);
      setSubmitError('');
      setCreated(await DeviceService.createDevice({
        displayName: form.displayName.trim(),
        audience: form.audience,
        location,
      }));
    } catch (err) {
      setSubmitError(err.message || 'Failed to add the board');
    } finally {
      setSubmitting(false);
    }
  };

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
              <h1 className="text-2xl font-semibold text-gray-900">Add board</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">The board is set up by a USB stick. It needs no network.</p>
          </div>
        </div>
      </div>

      {created ? (
        <>
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-5 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <strong>{created.displayName}</strong> is added. Download its USB kit (with the setup file) below.{' '}
              <Link to={`/admin/devices/${created.id}`} className="font-semibold underline">Open the board&apos;s page</Link>{' '}
              to change its location, prayer method or ticker.
            </div>
          </div>
          <UsbStickDownloads device={created} />
        </>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {submitError && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input type="text" value={form.displayName} onChange={set('displayName')} className={input} placeholder="North Musallah" />
              <span className="mt-1 block text-xs text-gray-500">The board shows it when its setup file is applied.</span>
              {errors.displayName && <span className="mt-1 block text-sm text-red-600">{errors.displayName}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Audience</span>
              <select value={form.audience} onChange={set('audience')} className={input}>
                <option value="BOTH">Both</option>
                <option value="BROTHERS">Brothers</option>
                <option value="SISTERS">Sisters</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">City</span>
              <input type="text" value={form.city} onChange={set('city')} className={input} placeholder="Mississauga" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Latitude</span>
              <input type="number" step="any" value={form.latitude} onChange={set('latitude')} className={input} placeholder="43.589" />
              {errors.latitude && <span className="mt-1 block text-sm text-red-600">{errors.latitude}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Longitude</span>
              <input type="number" step="any" value={form.longitude} onChange={set('longitude')} className={input} placeholder="-79.644" />
              {errors.longitude && <span className="mt-1 block text-sm text-red-600">{errors.longitude}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Time zone</span>
              <select value={form.timezone} onChange={set('timezone')} className={input}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Prayer time method</span>
              <select value={form.method} onChange={set('method')} className={input}>
                {CALCULATION_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs text-gray-500">Blank location fields keep the defaults; change them later on the board&apos;s page.</p>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add board
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddBoard;
