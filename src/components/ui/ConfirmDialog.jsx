import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { Input } from './Field';

/**
 * Confirmation for a destructive action.
 *
 * Radix `AlertDialog` rather than `Dialog`, and the distinction is not
 * cosmetic: an alert dialog announces itself as `role="alertdialog"`, describes
 * itself by its body text, and — the part that matters here — does *not* close
 * on an outside click. Losing a "delete this permanently?" prompt to a stray
 * click somewhere else on the page is fine; losing it and not knowing whether
 * you cancelled or missed is not.
 *
 * `confirmPhrase` adds a type-to-confirm box. Reserve it for writes that cannot
 * be undone from this console — revoking a display, deleting a submission.
 * Asking someone to type a name for something they could simply redo trains
 * them to type it without reading, which is worse than not asking at all.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  confirmPhrase,
  tone = 'danger',
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const armed = !confirmPhrase || typed.trim() === confirmPhrase;

  const close = () => {
    setTyped('');
    setError(null);
    onClose?.();
  };

  const run = async (e) => {
    // Radix closes on action by default; the write has to finish first, and it
    // may fail, in which case the dialog needs to stay up and say so.
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setTyped('');
      onClose?.();
    } catch (err) {
      setError(err?.message ?? 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && close()}>
      <AlertDialogContent className="bg-surface border-line rounded-md sm:max-w-md gap-0 p-5">
        <AlertDialogTitle className="text-ink text-[15px] font-semibold font-sans tracking-normal">
          {title}
        </AlertDialogTitle>

        <AlertDialogDescription asChild>
          <div className="mt-2.5 text-[12.5px] text-soft leading-relaxed">{body}</div>
        </AlertDialogDescription>

        {confirmPhrase && (
          <div className="mt-4">
            <label htmlFor="confirm-phrase" className="block mb-1.5 text-[12px] text-soft">
              Type <span className="val text-ink">{confirmPhrase}</span> to continue
            </label>
            <Input
              id="confirm-phrase"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {error && <p className="mt-3 text-[12.5px] text-bad">{error}</p>}

        <AlertDialogFooter className="mt-5 gap-2">
          <AlertDialogCancel
            disabled={busy}
            className="h-8 px-3 text-[12.5px] bg-transparent border-line text-soft hover:bg-raised hover:text-ink rounded-md"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={!armed || busy}
            className={
              tone === 'danger'
                ? 'h-8 px-3 text-[12.5px] rounded-md bg-bad-dim text-bad border border-bad/40 hover:bg-bad hover:text-on-bad disabled:opacity-50'
                : 'h-8 px-3 text-[12.5px] rounded-md bg-raised text-ink border border-line hover:bg-overlay disabled:opacity-50'
            }
          >
            {busy ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
