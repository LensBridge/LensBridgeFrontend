import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Search, X, AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ *
 * The small pieces. Each is a few lines, and splitting them into their
 * own files would mean nine imports at the top of every page.
 * ------------------------------------------------------------------ */

/**
 * Search box with a clear affordance that appears only once there is a query.
 *
 * Boxed rather than the underlined field the dark theme used. An underline on
 * a white card is one hairline among the several the card already draws, and
 * people were clicking the label above it.
 */
export function SearchInput({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[34px] bg-surface border border-line rounded-md pl-9 pr-8 text-[13px] text-ink
                   transition-[border-color,box-shadow] duration-150
                   hover:border-line-loud focus:border-ember focus:outline-none focus:ring-3 focus:ring-ember/12"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink transition-colors"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * Two-state copy button. Reverts after a moment rather than latching, so a
 * second copy of the same value still gives feedback.
 */
export function CopyButton({ value, label, className = '' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard is unavailable over plain http; the value is on screen anyway. */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ember transition-colors ${className}`}
    >
      {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
      {label ?? (copied ? 'Copied' : 'Copy')}
    </button>
  );
}

/**
 * One measured property: label left, value right, dotted leader between.
 *
 * The leader is the drawing convention for tying a callout to its value across
 * a gap, and it does the same job here it does on a spec sheet — at eight rows
 * deep your eye needs the track to stay on the line.
 *
 * Values are mono by default because nearly everything in a detail pane is a
 * measurement, an identifier or a timestamp. Pass `prose` for the rare row
 * that is a sentence.
 */
export function KeyValue({ label, children, prose, className = '' }) {
  return (
    <div className={`flex items-baseline gap-3 py-[7px] ${className}`}>
      <span className="cap shrink-0">{label}</span>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-line -translate-y-[2px] min-w-4"
      />
      <span
        className={`text-right min-w-0 break-words ${
          prose ? 'text-[12.5px] text-ink' : 'val text-[12px] text-ink'
        }`}
      >
        {children ?? <span className="text-faint">&mdash;</span>}
      </span>
    </div>
  );
}

const READOUT_TONE = {
  ink: 'text-ink',
  ember: 'text-ember',
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  faint: 'text-faint',
};

/**
 * A number worth crossing the room for.
 *
 * No box, no border, no icon. A numeral at this size does not need help being
 * found, and wrapping four of them in cards is exactly what made the page this
 * replaced look like every other dashboard. The label above and the note below
 * are small enough that the number is unambiguously the content.
 *
 * `unit` sits inline at label size: "71 C" set as one 52px string makes the
 * unit shout as loudly as the measurement, which is backwards.
 */
export function Readout({ label, value, unit, note, tone = 'ink', size = 'lg' }) {
  return (
    <div>
      <div className="cap">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5 overflow-hidden">
        <span
          key={value}
          className={`readout anim-tick ${READOUT_TONE[tone]} ${
            size === 'lg' ? 'text-[3.25rem]' : 'text-[1.875rem]'
          }`}
        >
          {value}
        </span>
        {unit && <span className="cap text-soft">{unit}</span>}
      </div>
      {note && <div className="mt-2.5 text-[12px] text-muted leading-snug">{note}</div>}
    </div>
  );
}

/** Inline failure notice for a panel that could not load or save. */
export function ErrorNote({ children, onRetry }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 bg-bad-dim border border-bad/20 rounded-md px-3.5 py-2.5">
      <AlertTriangle size={14} className="text-bad mt-0.5 shrink-0" strokeWidth={2.2} />
      <div className="flex-1 min-w-0 text-[13px] text-soft break-words">{children}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] text-bad hover:underline underline-offset-2 shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Monospaced well for tokens, ids, and command output. */
export function Well({ children, className = '' }) {
  return (
    <pre
      className={`bg-raised border border-hair rounded-md px-3.5 py-3 text-[12px] font-mono
                  text-soft leading-relaxed overflow-x-auto whitespace-pre-wrap break-words ${className}`}
    >
      {children}
    </pre>
  );
}

/** Placeholder bar for content that has not arrived. */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`shimmer bg-raised rounded-sm ${className}`} />;
}

/**
 * Mutually exclusive choice, rendered as a segmented pill group. Used for
 * audience (brothers / sisters / both) and other two-to-four-way filters,
 * where a select element would hide the options behind a click.
 *
 * The selected segment is a raised white chip inside a sunken track, which is
 * the one place in this console where an inset surface is worth the ink: it is
 * the only control whose *unselected* options must stay legible and clickable,
 * so highlighting the winner beats dimming the losers.
 */
export function SegmentedControl({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-md bg-raised border border-hair ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              'rounded-sm font-mono uppercase tracking-[0.1em] whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-[9.5px]' : 'px-3 py-1.5 text-[10px]',
              active
                ? 'bg-surface text-ink shadow-xs'
                : 'text-faint hover:text-soft',
            ].join(' ')}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
