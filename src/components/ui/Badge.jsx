/**
 * A status pill: tinted fill, no border, mono caps inside.
 *
 * Two halves of two designs, and both halves earn it. The shape is
 * tCketManage's — a filled rounded pill, which on white is the only badge
 * treatment that survives being read at a glance down a column of forty rows;
 * the hairline-outlined square the dark theme used disappears against a light
 * card, because there is no longer a dark ground for the outline to cut into.
 *
 * The type is Minbar's. A status *is* a value, so it is set in the mono face
 * and sits in the same visual family as the ids and timestamps beside it.
 *
 * Tones map to the status ramp, not to the accent. `ember` exists but is
 * reserved for the one thing per screen that is genuinely the subject — a live
 * device, the frame on screen right now — because a second ember element on a
 * page always steals from the first.
 */
const TONES = {
  neutral: 'bg-raised text-soft',
  good: 'bg-good-dim text-good',
  warn: 'bg-warn-dim text-warn',
  bad: 'bg-bad-dim text-bad',
  cool: 'bg-cool-dim text-cool',
  ember: 'bg-ember-dim text-ember',
  quiet: 'bg-raised text-faint',
};

export default function Badge({ tone = 'neutral', size = 'md', dot, icon: Icon, className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full whitespace-nowrap',
        'font-mono font-medium uppercase tracking-[0.1em] leading-none',
        size === 'sm' ? 'px-2 py-[3px] text-[9px]' : 'px-2.5 py-1 text-[10px]',
        TONES[tone] ?? TONES.neutral,
        className,
      ].join(' ')}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
