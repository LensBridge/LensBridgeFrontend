import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';
import Button from './Button';

/**
 * Modal frame for a step-based flow, lifted in shape from tCketManage's wizard
 * so the two consoles feel like one tool: a step rail down the left with a
 * progress spine, a sliding step body, and a footer whose primary action is
 * *blocked* rather than disabled when the step is not done — clicking it shakes
 * and reveals the reason instead of silently doing nothing.
 *
 * The caller owns `step` and the step bodies; the shell owns the frame, the
 * rail, the slide direction and the footer. `primary` overrides the default
 * Continue button — `{ label, icon, iconRight, onClick, busy, busyLabel }`;
 * omit it and the shell just advances a step. `onBlocked` fires when the
 * primary is clicked while `canContinue` is false, so the caller can surface
 * the field errors for the current step.
 *
 * Radix underneath for the focus trap and Escape handling, same as `Modal`.
 */

/** Title + one-line note at the top of a step body. Shared by every wizard so
 *  the heading over the fields looks the same everywhere. */
export function StepIntro({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-ink text-[15px] font-semibold">{title}</h2>
      {children && (
        <p className="mt-1 text-[12px] text-muted leading-relaxed max-w-[62ch]">{children}</p>
      )}
    </div>
  );
}

function StepRail({ steps, current, title }) {
  return (
    <div className="hidden sm:flex w-[210px] shrink-0 flex-col bg-ground border-r border-hair py-7">
      <div className="px-5 pb-5 mb-3 border-b border-hair">
        <span className="font-display text-[13px] font-semibold tracking-wide text-ink">
          {title}
        </span>
      </div>

      <div className="flex flex-col gap-4 px-1">
        {steps.map((s, i) => {
          const done = current > i;
          const active = current === i;
          const StepIcon = s.icon;
          return (
            <div key={s.id ?? i} className="relative flex items-start gap-3 pl-4 pr-3">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[calc(1rem+11px)] -top-2 h-4 w-0.5 -translate-x-1/2 transition-colors',
                    current >= i ? 'bg-ember' : 'bg-line'
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md transition-colors',
                  done
                    ? 'bg-good text-white'
                    : active
                      ? 'bg-ember text-on-ember ring-4 ring-ember/15'
                      : 'bg-raised text-faint'
                )}
              >
                {done ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : StepIcon ? (
                  <StepIcon size={12} strokeWidth={2} />
                ) : (
                  <span className="text-[10px] font-mono">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  'py-0.5 text-[12.5px] leading-tight',
                  active ? 'text-ink font-medium' : done ? 'text-soft' : 'text-faint'
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WizardShell({
  open,
  title,
  steps,
  step,
  onStepChange,
  onClose,
  dismissable = true,
  canContinue = true,
  onBlocked,
  primary,
  error,
  children,
}) {
  // +1 moving forward, -1 moving back — decides which way the body slides in.
  const [dir, setDir] = useState(1);
  const [shaking, setShaking] = useState(false);
  const scrollRef = useRef(null);
  const busy = !!primary?.busy;
  const lastStep = steps.length - 1;

  // Each step starts scrolled to the top.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  // Track the slide direction: +1 when the step moves forward, -1 back —
  // including jumps the shell did not initiate (a failed save sending the
  // caller back to the broken step). On a fresh open, forget the last run's
  // direction and shake; the shell stays mounted so the close still animates,
  // but its state should not carry over.
  const prevStep = useRef(step);
  const wasOpen = useRef(open);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (justOpened) {
      prevStep.current = step;
      setDir(1);
      setShaking(false);
      return;
    }
    if (step !== prevStep.current) {
      setDir(step > prevStep.current ? 1 : -1);
      prevStep.current = step;
    }
  }, [open, step]);

  // Dropping the class first lets a repeat click restart the animation.
  function reject() {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  }

  function handlePrimary() {
    if (!canContinue) {
      reject();
      onBlocked?.();
      return;
    }
    if (primary?.onClick) primary.onClick();
    else onStepChange(step + 1);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismissable && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
        onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
        onInteractOutside={(e) => !dismissable && e.preventDefault()}
        className={cn(
          'flex p-0 gap-0 overflow-hidden bg-surface border-hair rounded-lg shadow-xl',
          'w-full sm:max-w-[860px] h-[620px] max-h-[calc(100vh-3rem)]'
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Step {step + 1} of {steps.length}
        </DialogDescription>

        <StepRail steps={steps} current={step} title={title} />

        <div className="flex flex-1 min-w-0 flex-col">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-hair shrink-0">
            <span className="text-[12px] text-muted font-medium">
              Step {step + 1} of {steps.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              aria-label="Close"
              disabled={busy || !dismissable}
              onClick={onClose}
            />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            {/* Keyed on `step` so the wrapper remounts and the slide replays. */}
            <div key={step} className={cn('wiz-step', dir < 0 && 'wiz-step-back')}>
              {children}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-hair bg-surface-2 shrink-0">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              disabled={step === 0 || busy}
              onClick={() => onStepChange(Math.max(0, step - 1))}
            >
              Back
            </Button>

            <div className="flex items-center gap-3">
              {error && (
                <span className="text-[12px] text-bad text-right max-w-[280px]">{error}</span>
              )}
              <Button
                variant="primary"
                loading={busy}
                icon={busy || !primary ? undefined : primary.icon}
                iconRight={busy ? undefined : primary ? primary.iconRight : ArrowRight}
                className={cn(!canContinue && 'btn-blocked', shaking && 'shake')}
                aria-disabled={!canContinue || undefined}
                onClick={handlePrimary}
                onAnimationEnd={() => setShaking(false)}
              >
                {busy
                  ? (primary?.busyLabel ?? 'Working…')
                  : primary?.label ?? (step === lastStep ? 'Finish' : 'Continue')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
