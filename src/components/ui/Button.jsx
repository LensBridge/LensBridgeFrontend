import Spinner from './Spinner';

/**
 * The console's one button.
 *
 * Ember is the only accent in the brand, so exactly one variant may use it:
 * `primary`. Everything else is a step on the surface ramp. A screen with two
 * ember buttons has no primary action — if you reach for a second, one of them
 * is really a `secondary`.
 *
 * On a light ground `secondary` had to grow a white fill and a real border.
 * Against ink it could be a raised block with no outline and still read as a
 * control; against white a fill alone is invisible, and the border is what
 * says "this is pressable" before the pointer gets there.
 */
const VARIANTS = {
  primary:
    'bg-ember text-on-ember shadow-xs hover:bg-ember-deep active:bg-ember-deep ' +
    'disabled:bg-raised disabled:text-faint disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line shadow-xs hover:bg-raised hover:border-line-loud ' +
    'disabled:text-faint disabled:bg-raised disabled:shadow-none',
  ghost:
    'bg-transparent text-muted hover:bg-raised hover:text-ink ' +
    'disabled:text-faint disabled:hover:bg-transparent',
  danger:
    'bg-bad-dim text-bad border border-bad/20 hover:bg-bad hover:text-on-bad hover:border-bad ' +
    'disabled:opacity-50',
  // Reads as body copy until hovered; for inline "undo"-weight actions.
  link:
    'bg-transparent text-ember hover:text-ember-deep hover:underline underline-offset-4 px-0! ' +
    'disabled:text-faint disabled:no-underline',
};

/* 34px is tCketManage's control height, and every input in this console now
   matches it — a button beside a text field that is two pixels taller than it
   is the sort of thing nobody can name and everybody sees. */
const SIZES = {
  xs: 'h-7 px-2 text-[11px] gap-1 rounded-sm',
  sm: 'h-8 px-2.5 text-[12px] gap-1.5 rounded-sm',
  md: 'h-[34px] px-3.5 text-[13px] gap-1.5 rounded-md',
  lg: 'h-10 px-5 text-[14px] gap-2 rounded-md',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const iconOnly = !children && (Icon || IconRight);
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium whitespace-nowrap leading-none',
        'transition-colors duration-150 select-none press',
        'disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        iconOnly ? 'px-0 aspect-square' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 16 : 14} />
      ) : (
        Icon && <Icon size={size === 'xs' ? 12 : size === 'lg' ? 17 : 15} strokeWidth={2} />
      )}
      {children}
      {IconRight && !loading && (
        <IconRight size={size === 'xs' ? 12 : size === 'lg' ? 17 : 15} strokeWidth={2} />
      )}
    </button>
  );
}
