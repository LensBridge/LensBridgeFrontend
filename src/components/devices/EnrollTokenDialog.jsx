import { useEffect, useMemo, useState } from 'react';
import { Copy, Printer, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function EnrollTokenDialog({ tokenResponse, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = useMemo(() => {
    const ms = new Date(tokenResponse.expiresAt).getTime() - now;
    if (!Number.isFinite(ms) || ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, [tokenResponse.expiresAt, now]);

  const copyToken = async () => {
    await navigator.clipboard.writeText(tokenResponse.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Enrollment token issued</h3>
            <p className="text-sm text-gray-500">This token is shown once.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            If this dialog is closed before copying the token, issue a new one.
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Token</div>
            <div className="break-all rounded-lg bg-gray-950 p-4 font-mono text-lg text-white">{tokenResponse.token}</div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Expires in</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{remaining}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Token ID</div>
              <div className="mt-1 break-all font-mono text-sm text-gray-800">{tokenResponse.tokenId}</div>
            </div>
          </div>

          {showQr && (
            <div className="flex justify-center rounded-lg border border-gray-200 bg-white p-5">
              <QRCodeSVG value={tokenResponse.token} size={190} />
            </div>
          )}

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="mb-2 text-sm font-medium text-gray-700">Pi enroll command</div>
            <code className="block break-all rounded bg-white p-3 text-sm text-gray-800">
              musallahboard-agent enroll --token={tokenResponse.token} --backend=https://api.utmmsa.ca
            </code>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={copyToken} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy token'}
          </button>
          <button type="button" onClick={() => setShowQr((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <QrCode className="h-4 w-4" />
            {showQr ? 'Hide QR' : 'Show QR'}
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnrollTokenDialog;
