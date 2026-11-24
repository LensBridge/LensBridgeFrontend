import { useState } from 'react';
import useOnlineSetupDefault from '../../hooks/useOnlineSetupDefault';
import { AlertTriangle, Download, Loader2, Usb } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { clampDays, DEFAULT_CONTENT_DAYS, MAX_CONTENT_DAYS, saveBlob } from '../../utils/usbKit';

/**
 * One stick for every board: each board reads the whole MusallahBoard folder
 * and keeps only its own files, and only what is newer than what it has.
 */
function AllBoardsUsbKit() {
  const { can } = useAuth();
  const canSetUp = can(PERMISSIONS.BOARD_DEVICE_ENROLL);
  const [days, setDays] = useState(DEFAULT_CONTENT_DAYS);
  const [includeSetup, setIncludeSetup] = useState(false);
  const [online, setOnline] = useOnlineSetupDefault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const download = async () => {
    const safeDays = clampDays(days);
    setDays(safeDays);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { blob, filename, omitted } = await DeviceService.downloadAllBoardsUsbKit({
        days: safeDays, includeSetup: canSetUp && includeSetup, online: canSetUp && includeSetup && online,
      });
      saveBlob(blob, filename);
      if (omitted) setNotice(`The kit was made without: ${omitted}.`);
    } catch (err) {
      setError(err.message || 'Failed to build the USB kit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <Usb className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">USB kit for every board</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Unzip it onto a stick. Each board takes only its own files from the <code className="font-mono">MusallahBoard</code> folder.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Days
            <input
              type="number"
              min="1"
              max={MAX_CONTENT_DAYS}
              value={days}
              disabled={busy}
              onChange={(event) => setDays(event.target.value)}
              onBlur={() => setDays(clampDays(days))}
              className="mt-2 block w-20 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2"
            />
          </label>
          {canSetUp && (
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeSetup} onChange={(e) => setIncludeSetup(e.target.checked)} />
                Include setup files
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={online} disabled={!includeSetup} onChange={(e) => setOnline(e.target.checked)} />
                Online setup
              </label>
            </div>
          )}
          <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? 'Building kit...' : 'Download'}
          </button>
        </div>
      </div>
      {error && <div className="mt-4 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {notice && (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {notice}
        </div>
      )}
    </div>
  );
}

export default AllBoardsUsbKit;
