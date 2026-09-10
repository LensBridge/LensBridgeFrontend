/**
 * The Minbar mark: an arch standing on a detached platform.
 *
 * Geometry is copied exactly from the brand sheet (Claude Design 019e31dd,
 * "Minbar Logo Final.html") — a 7.5-unit stroke with round caps on a 100-unit
 * grid, radius 24 across a 26–74 span, with the platform as a separate ember
 * bar at y84. The two shapes are deliberately not merged: at small sizes the
 * gap is what makes it read as a minbar rather than a doorway.
 *
 * Two rules from assets/README.txt are enforced here rather than left to call
 * sites:
 *
 *   - stroke thickens as the mark shrinks, so the arch keeps its weight
 *     (96→7.5, 48→8, 32→9, 24→10);
 *   - below 24px the freestanding mark loses the arch/platform gap, so
 *     `<MinbarMark>` switches itself to the rounded icon shell.
 *
 * The platform is never recoloured to the ink tone. Ember is the only accent.
 */

/** Stroke weight for a rendered size, per the brand sheet's scale row. */
function strokeFor(size) {
  if (size >= 72) return 7.5;
  if (size >= 40) return 8;
  if (size >= 28) return 9;
  return 10;
}

/**
 * @param {object} props
 * @param {number} [props.size]      rendered px; drives stroke weight and shell fallback
 * @param {'reversed'|'ink'|'mono'}  [props.tone]
 *        `reversed` = the arch takes the console's primary type colour, so it
 *        is ink on the light theme and cream on the dark one — which is the
 *        brand's own reversed mark, arrived at by following the ramp,
 *        `ink` = dark arch (light backgrounds, e.g. print/export),
 *        `mono` = currentColor throughout, platform included.
 * @param {boolean} [props.shell]    force the rounded app-icon container
 */
export default function MinbarMark({ size = 32, tone = 'reversed', shell, className, ...rest }) {
  // Below 24px the standalone mark closes up; the shell keeps it legible.
  const useShell = shell ?? size < 24;

  const arch = tone === 'ink' ? 'var(--color-ink)' : tone === 'mono' ? 'currentColor' : 'var(--color-ink)';
  const bar = tone === 'mono' ? 'currentColor' : 'var(--color-ember)';

  if (useShell) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Minbar"
        className={className}
        {...rest}
      >
        {/*
          The shell does not follow the theme. `--color-ink` would make it a
          cream tile on the dark theme, and the app icon is a near-black tile
          with an ember mark on it — that is the artwork, not a position on the
          ramp. `--color-deep` is the brand constant and stays put.
        */}
        <rect width="100" height="100" rx="24" fill="var(--color-deep)" />
        <path
          d="M30 74 V50 A20 20 0 0 1 70 50 V74"
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={size < 20 ? 9 : 7}
          strokeLinecap="round"
        />
        <rect x="22" y="80" width="56" height={size < 20 ? 9 : 7.5} rx="3.75" fill="var(--color-ember)" />
      </svg>
    );
  }

  const w = strokeFor(size);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Minbar"
      className={className}
      {...rest}
    >
      <path
        d="M26 78 V48 A24 24 0 0 1 74 48 V78"
        fill="none"
        stroke={arch}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <rect x="16" y="84" width="68" height={w} rx={w / 2} fill={bar} />
    </svg>
  );
}

/**
 * Horizontal lockup — mark plus wordmark, at the proportions from the brand
 * sheet's Lockups panel (mark and wordmark share a baseline, gap ≈ 0.29× mark).
 */
export function MinbarLockup({ size = 34, sub, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <MinbarMark size={size} />
      <span className="wm text-ink" style={{ fontSize: size * 0.58 }}>
        MINBAR
      </span>
      {sub && (
        <>
          <span
            aria-hidden
            className="bg-ember"
            style={{ width: 5, height: 5, transform: 'rotate(45deg)' }}
          />
          <span
            className="font-display font-medium text-soft"
            style={{ fontSize: size * 0.45, letterSpacing: '0.04em' }}
          >
            {sub}
          </span>
        </>
      )}
    </span>
  );
}
