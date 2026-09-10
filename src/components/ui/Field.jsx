import { useId } from 'react';
import { Switch as ShadSwitch } from '@/components/shadcn/switch';
import { Checkbox as ShadCheckbox } from '@/components/shadcn/checkbox';

/**
 * Label + control + hint/error, in the one arrangement the console uses.
 *
 * The error replaces the hint rather than stacking under it: a field that shows
 * both makes the row taller exactly when the form is already at its most
 * cluttered, and the hint is never the thing you need to read at that moment.
 */
export default function Field({ label, hint, error, required, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block mb-1.5 text-[12px] font-medium text-muted tracking-wide"
        >
          {label}
          {required && <span className="text-ember ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/*
 * Inputs are white with a real border now, not a raised block with none. On
 * ink the fill alone said "you can type here"; on a light card a grey fill
 * says "this is disabled", which is the opposite. The 3px ember halo on focus
 * replaces the outline the dark theme could get away with — a 1px ember border
 * on white is a hairline you have to look for.
 */
const CONTROL =
  'w-full bg-surface border rounded-md px-3 text-ink text-[13px] ' +
  'transition-[color,border-color,box-shadow] duration-150 ' +
  'hover:border-line-loud focus:border-ember focus:outline-none focus:ring-3 focus:ring-ember/12 ' +
  'disabled:bg-raised disabled:text-faint disabled:cursor-not-allowed';

export function Input({ error, className = '', ...rest }) {
  // Email addresses are identifiers — things you read out, spell, and compare
  // character by character. They are set in the mono face everywhere the
  // console displays one, so the field you type it into matches.
  const identifier = rest.type === 'email';
  return (
    <input
      className={[
        CONTROL,
        'h-[34px]',
        identifier ? 'font-mono text-[12.5px] tracking-tight' : '',
        error ? 'border-bad' : 'border-line',
        className,
      ].join(' ')}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
}

export function Textarea({ error, rows = 4, className = '', ...rest }) {
  return (
    <textarea
      rows={rows}
      className={`${CONTROL} py-2 leading-relaxed resize-y ${error ? 'border-bad' : 'border-line'} ${className}`}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
}

/**
 * Native select, restyled. The chevron is drawn as a background image rather
 * than an overlaid icon so the whole control stays one hit target — an overlaid
 * svg swallows the click on the arrow, which is precisely where people aim.
 */
export function Select({ error, className = '', children, ...rest }) {
  return (
    <select
      className={[
        CONTROL,
        'h-[34px] appearance-none pr-9 cursor-pointer',
        error ? 'border-bad' : 'border-line',
        className,
      ].join(' ')}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9aa3' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

/**
 * Sliding toggle. Ember when on -- it is a state, and state is the accent's job.
 *
 * Radix underneath for the `role="switch"` / `aria-checked` pairing and for
 * space-and-enter handling. The hand-rolled one had the roles right but did not
 * respond to Space, which is the key most people actually press on a toggle.
 */
export function Switch({ checked, onChange, disabled, label, hint, id: providedId }) {
  const generated = useId();
  const id = providedId ?? generated;
  return (
    <div className="flex items-start gap-3">
      <ShadSwitch
        id={id}
        checked={!!checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="mt-0.5 h-5 w-9 data-[state=checked]:bg-ember data-[state=unchecked]:bg-line-loud/70"
      />
      {(label || hint) && (
        <label htmlFor={id} className="cursor-pointer select-none">
          {label && <span className="block text-[12.5px] text-ink leading-5">{label}</span>}
          {hint && <span className="block text-[11.5px] text-muted mt-0.5 leading-snug">{hint}</span>}
        </label>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, disabled, label, id: providedId, ...rest }) {
  const generated = useId();
  const id = providedId ?? generated;
  return (
    <div className="flex items-center gap-2.5">
      <ShadCheckbox
        id={id}
        checked={!!checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange?.(next === true)}
        className="size-4 rounded-xs border-line bg-surface data-[state=checked]:bg-ember data-[state=checked]:border-ember data-[state=checked]:text-on-ember"
        {...rest}
      />
      {label && (
        <label htmlFor={id} className="text-[12.5px] text-ink cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
