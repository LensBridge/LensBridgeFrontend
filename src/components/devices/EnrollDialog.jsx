import { useEffect, useMemo, useState } from 'react';
import { KeyRound, QrCode, TriangleAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DeviceService from '../../services/DeviceService';
import { Modal, Button, Field, Input, Select, ErrorNote, CopyButton, Well } from '../ui';
import { BASE_URL } from '../../api/client';

const EMPTY = { displayName: '', audience: 'both', expiresInMinutes: 30 };

/**
 * Mint a one-time enrollment token and show it exactly once.
 *
 * Two steps in one dialog rather than a page and a modal. The token is the
 * whole point of the interaction and it is unrecoverable — putting the form on
 * its own route meant the reveal appeared over a page the operator no longer
 * needed, and closing it navigated them somewhere unrelated.
 *
 * The countdown is live because these expire in minutes, and the difference
 * between "you have 28 minutes to walk this to the prayer room" and "this died
 * while you were looking for the Pi" is the only thing an operator needs from
 * this screen after they have copied the string.
 *
 * `audience` goes out lowercase, matching the enum values openapi.yaml declares.
 * The server reads either case, but the contract says lowercase and this should
 * agree with it.
 */
export default function EnrollDialog({ open, onClose, onEnrolled }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState('');
  const [issued, setIssued] = useState(null);
  const [showQr, setShowQr] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!issued) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issued]);

  const remaining = useMemo(() => {
    if (!issued) return null;
    const ms = new Date(issued.expiresAt).getTime() - now;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }, [issued, now]);

  const close = () => {
    setForm(EMPTY);
    setErrors({});
    setFailure('');
    setIssued(null);
    onClose();
  };

  const validate = () => {
    const next = {};
    if (!form.displayName.trim()) next.displayName = 'Give the display a name.';
    else if (form.displayName.length > 80) next.displayName = '80 characters at most.';
    const expires = Number(form.expiresInMinutes);
    if (!Number.isInteger(expires) || expires < 5 || expires > 1440)
      next.expiresInMinutes = 'Between 5 minutes and 24 hours.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFailure('');
    try {
      setIssued(
        await DeviceService.issueEnrollmentToken({
          displayName: form.displayName.trim(),
          audience: form.audience,
          expiresInMinutes: Number(form.expiresInMinutes),
        })
      );
      onEnrolled?.();
    } catch (err) {
      setFailure(err.message || 'Could not issue a token.');
    } finally {
      setSubmitting(false);
    }
  };

  if (issued) {
    const command = `musallahboard-agent enroll --token=${issued.token} --backend=${BASE_URL}`;
    return (
      <Modal
        open={open}
        onClose={close}
        size="md"
        caption="Shown once"
        title="Enrollment token"
        footer={
          <>
            <Button variant="ghost" icon={QrCode} onClick={() => setShowQr((v) => !v)}>
              {showQr ? 'Hide QR' : 'Show QR'}
            </Button>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 bg-warn-dim/50 border border-warn/30 rounded-md px-3.5 py-2.5 mb-5">
          <TriangleAlert size={14} className="text-warn mt-0.5 shrink-0" strokeWidth={2.2} />
          <p className="text-[13px] text-ink leading-relaxed">
            Copy this before closing. The server stores a hash, not the token — there is no way to
            read it back, only to issue another.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="cap">Token</span>
          <CopyButton value={issued.token} />
        </div>
        <div className="break-all rounded-md bg-raised border border-hair px-4 py-3.5 font-mono text-[15px] text-ember tracking-wide">
          {issued.token}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-raised border border-hair rounded-md px-4 py-3">
            <div className="cap">Expires in</div>
            <div
              className={`mt-1.5 font-display text-xl tabular ${remaining ? 'text-ink' : 'text-bad'}`}
            >
              {remaining ?? 'Expired'}
            </div>
          </div>
          <div className="bg-raised border border-hair rounded-md px-4 py-3">
            <div className="cap">Token id</div>
            <div className="mt-1.5 font-mono text-[11px] text-soft break-all">{issued.tokenId}</div>
          </div>
        </div>

        {showQr && (
          /*
            The plate is `cream`, not `ink`. It used to be the ink token, which
            was the same near-black in the only theme there was; on the dark
            theme that token is cream and the plate would have turned into a
            pale tile with a pale QR sitting on it. Both values here are brand
            constants that do not follow the theme, which is what a scanner
            wants: the quiet zone around a code has to stay light and the
            modules dark, whichever way the console is running.
          */
          <div className="flex justify-center bg-cream rounded-md p-5 mt-4">
            <QRCodeSVG value={issued.token} size={180} bgColor="#F5E9DC" fgColor="#1C1210" />
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="cap">Agent command</span>
            <CopyButton value={command} />
          </div>
          <Well>{command}</Well>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      caption="MusallahBoard"
      title="Enroll a display"
      size="sm"
      dismissable={!submitting}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" icon={KeyRound} onClick={submit} loading={submitting}>
            Issue token
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {failure && <ErrorNote>{failure}</ErrorNote>}

        <Field
          label="Display name"
          htmlFor="en-name"
          required
          error={errors.displayName}
          hint="How this screen is identified everywhere else in the console."
        >
          <Input
            id="en-name"
            autoFocus
            maxLength={80}
            placeholder="Lobby board"
            error={errors.displayName}
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
        </Field>

        <Field
          label="Audience"
          htmlFor="en-audience"
          hint="Decides which posters, events and socials this screen is sent."
        >
          <Select
            id="en-audience"
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
          >
            <option value="both">Both</option>
            <option value="brothers">Brothers</option>
            <option value="sisters">Sisters</option>
          </Select>
        </Field>

        <Field
          label="Valid for"
          htmlFor="en-expiry"
          error={errors.expiresInMinutes}
          hint="Minutes. Keep it short — anyone holding an unexpired token can enrol a device onto the fleet."
        >
          <Input
            id="en-expiry"
            type="number"
            min="5"
            max="1440"
            error={errors.expiresInMinutes}
            value={form.expiresInMinutes}
            onChange={(e) => setForm((f) => ({ ...f, expiresInMinutes: e.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}
