import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';

const WIDTHS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

/**
 * Dialog.
 *
 * Radix underneath, which is the reason for the swap rather than the look: the
 * hand-rolled version this replaced moved focus to the panel on open but never
 * *trapped* it, so tabbing walked straight out of the dialog and into the page
 * behind it — which on a page whose controls are covered by a scrim is
 * genuinely disorienting. Radix also restores focus to the trigger on close and
 * marks the rest of the tree `aria-hidden`, neither of which was happening.
 *
 * The public shape is unchanged (`open`, `onClose`, `title`, `caption`, `size`,
 * `dismissable`, `footer`), so no page had to be touched.
 *
 * `dismissable: false` blocks Escape and outside-click both. It is for a dialog
 * mid-submit: a write that has left the browser should not have its UI vanish
 * under a stray click, leaving the operator unsure whether it landed.
 *
 * Radix requires a title for screen readers. Dialogs here always have a visible
 * one; the description is hidden unless a caption was supplied, so the
 * announcement is not just the title read twice.
 */
export default function Modal({
  open,
  onClose,
  title,
  caption,
  size = 'md',
  dismissable = true,
  footer,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent
        showCloseButton={dismissable}
        onEscapeKeyDown={(e) => !dismissable && e.preventDefault()}
        onPointerDownOutside={(e) => !dismissable && e.preventDefault()}
        onInteractOutside={(e) => !dismissable && e.preventDefault()}
        className={cn(
          'bg-surface border-hair gap-0 p-0 rounded-lg shadow-xl',
          'max-h-[calc(100vh-4rem)] overflow-y-auto',
          WIDTHS[size]
        )}
      >
        {(title || caption) && (
          <header className="px-5 py-4 border-b border-hair">
            {caption && <div className="cap mb-1.5">{caption}</div>}
            <DialogTitle className="text-ink text-[15px] font-semibold font-sans tracking-normal">
              {title}
            </DialogTitle>
            {caption ? (
              <DialogDescription className="sr-only">{caption}</DialogDescription>
            ) : null}
          </header>
        )}

        <div className="px-5 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-hair">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
