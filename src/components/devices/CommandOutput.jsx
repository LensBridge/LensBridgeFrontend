import { Download } from 'lucide-react';

function downloadBase64Png(base64, filename) {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64}`;
  link.download = filename;
  link.click();
}

function CommandOutput({ command }) {
  const output = command.output;

  if (!output) {
    return command.errorMessage ? (
      <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-700">{command.errorMessage}</pre>
    ) : (
      <div className="text-sm text-gray-500">No output yet.</div>
    );
  }

  if (command.kind === 'chrome.screenshot' && output.base64) {
    return (
      <div className="space-y-3">
        <img
          src={`data:image/png;base64,${output.base64}`}
          alt="Device screenshot"
          className="max-h-[520px] w-full rounded-lg border border-gray-200 object-contain bg-gray-50"
        />
        <button
          type="button"
          onClick={() => downloadBase64Png(output.base64, `${command.deviceId || 'device'}-${command.id}.png`)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>
    );
  }

  if (command.kind === 'logs.tail' && Array.isArray(output.lines)) {
    return (
      <pre className="max-h-[420px] overflow-auto rounded-lg bg-gray-950 p-4 text-xs leading-5 text-gray-100">
        {output.lines.slice(-500).join('\n')}
      </pre>
    );
  }

  return (
    <pre className="max-h-[360px] overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

export default CommandOutput;
