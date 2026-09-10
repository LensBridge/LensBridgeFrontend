import { useMemo, useState } from 'react';
import { Camera, FileText, Power, RefreshCcw, RotateCw, ServerCog } from 'lucide-react';
import DeviceService from '../../services/DeviceService';
import { useAuth } from '../../context/AuthContext';
import { COMMAND_PERMISSIONS, COMMAND_RISK, PERMISSIONS } from '../../utils/permissions';
import { Button, Badge, Modal, Field, Input, ErrorNote, ConfirmDialog } from '../ui';

const QUICK_COMMANDS = [
  { kind: 'chrome.reload', label: 'Reload Chrome', icon: RotateCw },
  { kind: 'config.refresh', label: 'Refresh config', icon: RefreshCcw },
  { kind: 'chrome.screenshot', label: 'Screenshot', icon: Camera },
  { kind: 'kiosk.restart', label: 'Restart kiosk', icon: ServerCog, confirm: true },
  { kind: 'system.reboot', label: 'Reboot device', icon: Power, confirm: true },
];

/**
 * The three command permissions are separately grantable, so the buttons have to
 * carry their risk class on their face.
 *
 * `inspect` in particular is a surveillance primitive — a screenshot of a
 * display in a prayer space, or the device's system logs — and it should not
 * look like a page reload. It gets the warning tone that `disruptive` does,
 * because pointing a camera at a room and rebooting the hardware are both
 * things you should have to mean.
 */
const RISK_TONE = { benign: 'quiet', disruptive: 'warn', inspect: 'warn' };

function RiskChip({ permission }) {
  const risk = COMMAND_RISK[permission];
  if (!risk || risk === 'benign') return null;
  return (
    <Badge tone={RISK_TONE[risk]} size="sm">
      {risk}
    </Badge>
  );
}

export default function CommandLauncher({ deviceId, onIssued, disabled }) {
  const { can, canAny } = useAuth();
  const [submitting, setSubmitting] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [lines, setLines] = useState(100);
  const [error, setError] = useState('');

  // The endpoint resolves its @PreAuthorize from the request body, so there is
  // no single permission that gates the row — each kind is checked on its own.
  const allowed = useMemo(
    () => QUICK_COMMANDS.filter((command) => can(COMMAND_PERMISSIONS[command.kind])),
    [can]
  );
  const canTailLogs = can(PERMISSIONS.BOARD_COMMAND_INSPECT);
  const canIssueAny = canAny([
    PERMISSIONS.BOARD_COMMAND_BENIGN,
    PERMISSIONS.BOARD_COMMAND_DISRUPTIVE,
    PERMISSIONS.BOARD_COMMAND_INSPECT,
  ]);

  const issue = async (kind, payload = {}) => {
    setError('');
    setSubmitting(kind);
    try {
      const issued = await DeviceService.issueCommand(deviceId, {
        kind,
        payload,
        // A log tail waits on the agent reading journalctl; 30s is not enough.
        deadlineMs: kind === 'logs.tail' ? 45000 : 30000,
      });
      onIssued?.(issued);
      setShowLogs(false);
    } catch (err) {
      setError(err.message || 'Failed to issue the command.');
      throw err;
    } finally {
      setSubmitting('');
    }
  };

  if (!canIssueAny) return null;

  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap gap-2">
        {allowed.map((command) => (
          <Button
            key={command.kind}
            size="sm"
            icon={command.icon}
            disabled={disabled || !!submitting}
            loading={submitting === command.kind}
            onClick={() =>
              command.confirm ? setConfirming(command) : issue(command.kind).catch(() => {})
            }
          >
            {command.label}
            <RiskChip permission={COMMAND_PERMISSIONS[command.kind]} />
          </Button>
        ))}

        {canTailLogs && (
          <Button
            size="sm"
            icon={FileText}
            disabled={disabled || !!submitting}
            onClick={() => setShowLogs(true)}
          >
            Tail logs
            <RiskChip permission={PERMISSIONS.BOARD_COMMAND_INSPECT} />
          </Button>
        )}
      </div>

      <Modal
        open={showLogs}
        onClose={() => setShowLogs(false)}
        caption="Inspect"
        title="Tail device logs"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogs(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting === 'logs.tail'}
              onClick={() =>
                issue('logs.tail', { lines: Math.min(500, Math.max(1, lines || 100)) }).catch(
                  () => {}
                )
              }
            >
              Request logs
            </Button>
          </>
        }
      >
        <Field
          label="Lines"
          htmlFor="log-lines"
          hint="The server clamps this between 1 and 500. Reading a device's logs is recorded in the audit log."
        >
          <Input
            id="log-lines"
            type="number"
            min="1"
            max="500"
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => issue(confirming.kind)}
        title={`${confirming?.label}?`}
        confirmLabel={confirming?.label ?? 'Issue'}
        tone="danger"
        body={
          confirming?.kind === 'system.reboot'
            ? 'The display goes dark until the Pi finishes booting — usually under a minute, longer if the filesystem needs checking. Do not do this during Jummah.'
            : 'The kiosk browser restarts and the screen blanks for a few seconds. Anything mid-animation restarts from the top of the rotation.'
        }
      />
    </div>
  );
}
