import MinbarMark from '../brand/MinbarMark';
import ThemeToggle from './ThemeToggle';

/**
 * The frame for the four screens you can reach signed out.
 *
 * The form used to sit inside a drawing frame with registration ticks at the
 * corners, the way every panel on the brand sheet does. That detail belonged
 * to the dark theme: a 2px ember tick reads as a deliberate mark against ink
 * and as a rendering artefact against white — four little orange scratches
 * around a login box.
 *
 * What replaced it is a card, lifted further off the ground than any card
 * inside the console. There is one thing on this screen and it should look
 * like the one thing on this screen.
 *
 * The wordmark sits above the card rather than inside it, so the first thing
 * read is whose console this is and the second is what it wants from you.
 */
export default function AuthLayout({ title, caption, children, footer }) {
  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center px-5 py-12">
      {/*
        The signed-out screens have no top bar, and the login box is the first
        thing anyone sees on a new machine — which is the most likely moment for
        the console to come up in the wrong theme. Tucked into the corner so it
        is reachable without competing with the one form on the page.
      */}
      <div className="fixed top-3 right-3">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[22rem]">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <MinbarMark size={26} />
          <span className="wm text-ink text-[15px]">MINBAR</span>
          <span aria-hidden className="w-1 h-1 rotate-45 bg-ember" />
          <span className="cap">Console</span>
        </div>

        <div className="anim-in bg-surface border border-hair rounded-lg shadow-lg px-6 py-7">
          {(title || caption) && (
            <div className="mb-6">
              {caption && <div className="cap mb-1.5">{caption}</div>}
              {title && <h1 className="text-ink text-[17px]">{title}</h1>}
            </div>
          )}
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-[12px] text-muted leading-relaxed">{footer}</div>
        )}
      </div>
    </div>
  );
}
