/**
 * The top of every route: title, one line of explanation, and the page's own
 * actions on the right.
 *
 * The eyebrow is gone. It used to hang the section name in the layout gutter —
 * "MusallahBoard" over "Displays" — but the top bar now carries exactly that
 * pair, two inches above and in the same mono caps. Printing it twice on every
 * page was the kind of duplication that only survives because each half was
 * written by someone looking at the other one.
 *
 * The title is deliberately smaller than the readout numerals further down the
 * page. Chrome should not be the biggest thing on a screen whose job is to
 * show you a number — the inversion is the point.
 */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <header className="anim-in mb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-ink">{title}</h1>
          {description && (
            <p className="mt-1.5 text-[12.5px] text-muted max-w-[60ch] leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
