import { useState } from 'react';
import useOnlineSetupDefault from '../../hooks/useOnlineSetupDefault';
import { AlertTriangle, Download, FileKey, Loader2, Printer, Usb } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { clampDays, DEFAULT_CONTENT_DAYS, MAX_CONTENT_DAYS, printVolunteerCard, saveBlob, volunteerSteps } from '../../utils/usbKit';
import VolunteerCard from './VolunteerCard';

/**
 * Everything a USB stick carries to one board: the USB kit (content, the latest
 * board app and agent, and optionally the setup file), the setup file alone,
 * or this board's content alone for a weekly update.
 *
 * "Online setup" puts the backend URL and a new claim secret in the setup
 * file, so the board connects by itself whenever it has a network. It starts
 * on whenever the server has a backend URL for boards: an online file costs a
 * board that never gets a network nothing.
 */
function UsbStickDownloads({ device }) {
  const { can } = useAuth();
  const canSetUp = can(PERMISSIONS.BOARD_DEVICE_ENROLL);
  const neverConnected = !device.enrolledAt;
  const [days, setDays] = useState(DEFAULT_CONTENT_DAYS);
  const [includeSetup, setIncludeSetup] = useState(canSetUp && neverConnected);
  const [online, setOnline] = useOnlineSetupDefault();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (what, download) => {
    const safeDays = clampDays(days);
    setDays(safeDays);
    setBusy(what);
    setError('');
    setNotice('');
    try {
      const { blob, filename, omitted } = await download(safeDays);
      saveBlob(blob, filename);
      if (omitted) {
        setNotice(`The kit was made without: ${omitted}. Boards still get their content; add the software to the stick later.`);
      }
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setBusy('');
    }
  };

  const downloadKit = () => run('kit', (safeDays) => DeviceService.downloadUsbKit(device.id, {
    days: safeDays, includeSetup: canSetUp && includeSetup, online: canSetUp && includeSetup && online,
  }));
  const downloadSetup = () => run('setup', () => DeviceService.downloadSetupFile(device.id, online));
  const downloadContent = () => run('content', (safeDays) => DeviceService.downloadOfflineBundle(device.id, safeDays));

  const button = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
  const spinnerOr = (what, Icon) => (busy === what ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Usb className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">USB stick</h2>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        The <strong>USB kit</strong> is a zip with one <code className="font-mono">MusallahBoard</code> folder: this board&apos;s
        content for the coming days and the latest board app and agent{canSetUp ? ', and its setup file if you tick it' : ''}.
        Content you edit later reaches an offline board only with a new stick.
      </p>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm font-medium text-gray-700">
          Days of content
          <input
            type="number"
            min="1"
            max={MAX_CONTENT_DAYS}
            value={days}
            disabled={Boolean(busy)}
            onChange={(event) => setDays(event.target.value)}
            onBlur={() => setDays(clampDays(days))}
            className="mt-2 block w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        {canSetUp && (
          <div className="space-y-2 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeSetup} onChange={(e) => setIncludeSetup(e.target.checked)} />
              Include the setup file (a new board, or a replaced SD card)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
              Online setup: the board will have a network and connects to this server
            </label>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={downloadKit} disabled={Boolean(busy)} className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}>
          {spinnerOr('kit', Download)}
          {busy === 'kit' ? 'Building kit...' : 'Download USB kit'}
        </button>
        {canSetUp && (
          <button type="button" onClick={downloadSetup} disabled={Boolean(busy)} className={`${button} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
            {spinnerOr('setup', FileKey)}
            Download setup file only
          </button>
        )}
        <button type="button" onClick={downloadContent} disabled={Boolean(busy)} className={`${button} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
          {spinnerOr('content', Download)}
          Download content only
        </button>
      </div>
      {online && canSetUp && (
        <p className="mt-3 text-xs text-gray-500">
          Each online setup file replaces the previous one: only the newest can connect the board.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-4">
        <VolunteerCard steps={volunteerSteps(device.displayName)} />
        <button type="button" onClick={() => printVolunteerCard(device.displayName)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
    </section>
  );
}

export default UsbStickDownloads;
