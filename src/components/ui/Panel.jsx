/**
 * A section of a page — now a card.
 *
 * The dark theme deliberately refused to box anything: structure came from a
 * rule and a fixed gutter, the way a drawing sheet's does, and a border meant
 * "this is a control" precisely because so few things had one. That works on
 * ink. On a light ground the same page reads as one undifferentiated sheet of
 * white, and the gutter labels float away from the content they name.
 *
 * So: white card, hairline border, 13px corners, one-pixel shadow. The same
 * shape tCketManage uses, and the header row keeps the eyebrow the old gutter
 * carried, so nothing lost its label in the move.
 *
 * `caption` is the overline, `title` the section heading. Most sections want
 * one or the other, not both.
 *
 * Rest props are spread onto the section — `id`, mainly, which is how
 * `/account#password` finds the password card.
 */
export default function Panel({
  title,
  caption,
  actions,
  footer,
  padded = true,
  className = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  const header = caption || title || actions;

  return (
    <section className={`card ${className}`} {...rest}>
      {header && (
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 border-b border-hair">
          <div className="flex-1 min-w-0">
            {caption && <div className="cap">{caption}</div>}
            {title && (
              <h2 className={`text-ink leading-snug ${caption ? 'mt-1' : ''}`}>{title}</h2>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
      )}

      <div className={`${padded ? 'p-4' : ''} ${bodyClassName}`}>{children}</div>

      {footer && (
        // `empty:hidden` because a footer is usually a <Pagination> that
        // returns null on a single page. Without it the card grows a blank
        // ruled strip whenever the data happens to fit.
        <footer className="px-4 py-3 border-t border-hair empty:hidden">{footer}</footer>
      )}
    </section>
  );
}

/** A divider inside a card body, where two runs of content share one panel. */
export function Rule({ className = '' }) {
  return <hr className={`border-0 border-t border-hair my-4 ${className}`} />;
}

/**
 * Wraps a run of cards, spacing them evenly and staggering their arrival.
 * Saves every page remembering the gap and getting one of them wrong.
 */
export function Sheet({ children, className = '' }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {items.map((child, i) => (
        // Cards arrive in reading order rather than all at once. `--i` drives
        // the delay; the cap keeps a long page from turning its own load into
        // a queue you wait through.
        <div key={i} className="anim-stagger" style={{ '--i': Math.min(i, 6) }}>
          {child}
        </div>
      ))}
    </div>
  );
}
