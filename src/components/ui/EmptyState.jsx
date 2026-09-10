import MinbarMark from '../brand/MinbarMark';

/**
 * The zero state.
 *
 * The icon sits in a rounded tile rather than floating at 30% opacity — on a
 * white card a faint outline glyph reads as a rendering failure, where the
 * same glyph in a grey square reads as a placeholder someone put there on
 * purpose.
 *
 * Defaults to the brand mark rather than a generic illustration: an empty
 * table is the most common screen in a console someone has just been given
 * access to, and it may as well say whose console it is.
 */
export default function EmptyState({ icon: Icon, title, body, action, compact }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-9' : 'py-14'} px-6`}>
      <div className="size-12 rounded-lg bg-raised grid place-items-center mb-3.5">
        {Icon ? (
          <Icon size={20} strokeWidth={1.7} className="text-faint" />
        ) : (
          <MinbarMark size={24} />
        )}
      </div>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {body && <p className="mt-1.5 text-[12.5px] text-muted max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
