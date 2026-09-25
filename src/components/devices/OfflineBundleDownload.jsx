import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import DeviceService from '../../services/DeviceService';

const clampDays = (value) => Math.min(31, Math.max(1, Math.round(Number(value)) || 14));

function OfflineBundleDownload({ deviceId }) {
  const [days, setDays] = useState(14);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    const safeDays = clampDays(days);
    setDays(safeDays);
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await DeviceService.downloadOfflineBundle(deviceId, safeDays);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(err.message || 'Failed to build the offline bundle');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Offline bundle</h2>
        <p className="mt-1 text-sm text-gray-500">
          Plug a laptop into the board&apos;s ethernet port and run <code className="font-mono">mbpush &lt;file&gt;</code> with the downloaded zip.
        </p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-gray-700">
          Days
          <input
            type="number"
            min="1"
            max="31"
            value={days}
            disabled={downloading}
            onChange={(event) => setDays(event.target.value)}
            onBlur={() => setDays(clampDays(days))}
            className="mt-2 block w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? 'Building bundle...' : 'Download offline bundle'}
        </button>
      </div>
    </section>
  );
}

export default OfflineBundleDownload;
