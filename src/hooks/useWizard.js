import { useCallback, useMemo, useState } from 'react';

/**
 * The bookkeeping every `WizardShell` form repeats: which step is open, which
 * steps have been "attempted" (so a field's error stays hidden until someone
 * has tried to leave its step, and the first screen is not red before anything
 * is typed), and the derived "can this step be left" flag.
 *
 * @param {{fields?: string[]}[]} steps  the array handed to WizardShell; each
 *   entry lists the form keys that step owns.
 * @param {Record<string,string|undefined>} problems  field -> message for
 *   everything currently invalid, recomputed by the caller each render.
 * @param {Record<string,string|undefined>} serverErrors  field -> message the
 *   API sent back; shown whether or not the step was attempted, and cleared by
 *   the caller on each new submit.
 */
export default function useWizard(steps, problems, serverErrors = {}) {
  const [index, setIndex] = useState(0);
  const [attempted, setAttempted] = useState(() => new Set());
  const last = steps.length - 1;

  const stepOfField = useMemo(() => {
    const map = {};
    steps.forEach((step, i) => (step.fields ?? []).forEach((field) => { map[field] = i; }));
    return map;
  }, [steps]);

  const stepHasErrors = useCallback(
    (i) => (steps[i]?.fields ?? []).some((field) => problems[field]),
    [steps, problems]
  );

  /** Mark one step attempted, so its field errors start showing. */
  const reveal = useCallback((i) => setAttempted((set) => new Set(set).add(i)), []);

  /** Mark every step up to and including `i` attempted — used when a submit is
   *  bounced back to the earliest broken step. */
  const revealThrough = useCallback(
    (i) => setAttempted(new Set(steps.map((_, n) => n).filter((n) => n <= i))),
    [steps]
  );

  /** Move to `next`; going forward counts as attempting the step being left. */
  const go = useCallback((next) => {
    setIndex((cur) => {
      if (next > cur) setAttempted((set) => new Set(set).add(cur));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setIndex(0);
    setAttempted(new Set());
  }, []);

  /** The error to show under a box: the server's if it sent one, otherwise the
   *  live check — but only once this field's step has been attempted. */
  const showErr = useCallback(
    (field) =>
      serverErrors[field] ??
      (attempted.has(stepOfField[field]) ? problems[field] : undefined),
    [serverErrors, attempted, stepOfField, problems]
  );

  /** The earliest step with an outstanding problem, or -1. */
  const firstBrokenStep = useCallback(
    () => steps.findIndex((step) => (step.fields ?? []).some((field) => problems[field])),
    [steps, problems]
  );

  return {
    index,
    setIndex,
    last,
    isLast: index === last,
    canContinue: index === last || !stepHasErrors(index),
    stepError:
      index !== last && attempted.has(index) && stepHasErrors(index)
        ? 'Fix the highlighted fields to continue.'
        : null,
    go,
    reveal,
    revealThrough,
    reset,
    showErr,
    firstBrokenStep,
  };
}
