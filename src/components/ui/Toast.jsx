import { useMemo } from 'react';
import { Toaster, toast } from 'sonner';

/**
 * Transient confirmations, bottom-right.
 *
 * Sonner underneath. The hand-rolled provider this replaced kept its own array
 * in React state, which meant a toast fired from inside a dialog re-rendered
 * the whole tree under it, and stacking/exit animation had to be hand-managed.
 * Sonner owns its own store outside React and handles both.
 *
 * The API is unchanged — `useToast()` still hands back
 * `{ success, error, warn, info, push, dismiss }` and `detail` is still the
 * second line — so no call site moved.
 *
 * Errors stay until dismissed; everything else expires. A failed write is the
 * one message that has to still be there when someone looks up from the form
 * they were filling in, and it is also the one most likely to arrive while
 * their attention is elsewhere.
 */
export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        gap={8}
        offset={20}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'anim-in flex items-start gap-3 w-full bg-surface border border-hair rounded-lg px-4 py-3 shadow-lg',
            title: 'text-[12.5px] font-medium text-ink leading-snug',
            description: 'text-[11.5px] text-muted mt-1 break-words',
            closeButton: 'text-faint hover:text-ink',
            success: 'border-good/40',
            error: 'border-bad/40',
            warning: 'border-warn/40',
            info: 'border-cool/40',
          },
        }}
      />
    </>
  );
}

/** `detail` is this console's name for the second line; sonner calls it description. */
const opts = ({ detail, duration } = {}, fallbackDuration) => ({
  description: detail,
  duration: duration ?? fallbackDuration,
});

// The hook ships with its provider; splitting them to satisfy fast refresh
// would leave a two-line file beside a component nobody imports without it.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useMemo(
    () => ({
      success: (m, o) => toast.success(m, opts(o, 4200)),
      // Infinity is sonner's "stay put"; the old provider spelled it `0`.
      error: (m, o) => toast.error(m, { ...opts(o, Infinity), closeButton: true }),
      warn: (m, o) => toast.warning(m, opts(o, 5000)),
      info: (m, o) => toast(m, opts(o, 4200)),
      push: (m, o = {}) => {
        const tone = o.tone ?? 'info';
        const fn = { success: toast.success, error: toast.error, warn: toast.warning }[tone] ?? toast;
        return fn(m, opts(o, tone === 'error' ? Infinity : 4200));
      },
      dismiss: (id) => toast.dismiss(id),
    }),
    []
  );
}
