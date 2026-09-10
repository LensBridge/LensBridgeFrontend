import { Download } from 'lucide-react';
import Button from '../ui/Button';
import { Well } from '../ui/Bits';

function downloadBase64Png(base64, filename) {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64}`;
  link.download = filename;
  link.click();
}

/**
 * Renders whatever the agent sent back, by command kind.
 *
 * A screenshot is an image, a log tail is a terminal, and anything else is JSON.
 * Falling back to pretty-printed JSON rather than nothing means a command kind
 * added on the agent side is still readable here before the console knows
 * about it.
 */
export default function CommandOutput({ command }) {
  const output = command.output;

  if (!output) {
    return command.errorMessage ? (
      <pre className="whitespace-pre-wrap rounded-md bg-bad-dim/50 border border-bad/30 px-3.5 py-3 text-[12px] font-mono text-ink">
        {command.errorMessage}
      </pre>
    ) : (
      <p className="text-[12px] text-muted">No output yet.</p>
    );
  }

  if (command.kind === 'chrome.screenshot' && output.base64) {
    return (
      <div className="space-y-3">
        <img
          src={`data:image/png;base64,${output.base64}`}
          alt="Screenshot of the display"
          className="max-h-[520px] w-full rounded-md border border-hair object-contain bg-raised"
        />
        <Button
          size="sm"
          icon={Download}
          onClick={() =>
            downloadBase64Png(output.base64, `${command.deviceId || 'device'}-${command.id}.png`)
          }
        >
          Download PNG
        </Button>
      </div>
    );
  }

  if (command.kind === 'logs.tail' && Array.isArray(output.lines)) {
    return (
      <Well className="max-h-[420px] overflow-auto whitespace-pre">
        {output.lines.slice(-500).join('\n')}
      </Well>
    );
  }

  return <Well className="max-h-[360px] overflow-auto">{JSON.stringify(output, null, 2)}</Well>;
}
