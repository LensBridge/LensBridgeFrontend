import { frameTypeLabel } from '../../models/board';

/**
 * A board's slide rotation, drawn as a timing diagram.
 *
 * Every MusallahBoard is a loop of frames, each held for a number of seconds.
 * Rendered as a list, that is a column of names and durations you have to add
 * up in your head. Rendered to scale, the shape of the loop is immediate: you
 * can see that one poster is eating a third of the cycle, or that the agenda
 * and the quote together outweigh everything else, or that a board is showing
 * two frames on a fourteen-second loop because nothing else matched its
 * audience today.
 *
 * The drafting conventions are load-bearing, not decoration:
 *
 *   - **Width is time.** A segment's width is its share of the cycle. This is
 *     the only element in the console drawn to scale, and it is drawn to scale
 *     because duration is the one quantity here that is genuinely continuous.
 *   - **Hatching means "not to scale".** A frame with `durationInSeconds: null`
 *     is auto-timed — the board sizes it to its own content at render time, so
 *     its true width is unknowable from here. Drawing it as a solid block of a
 *     guessed width would be a lie; hatching is the drawing convention for
 *     exactly that situation.
 *   - **Ember marks the live frame**, matched from the device's telemetry
 *     (`displayedFrameKey`). One accent, on the one thing that is true right
 *     now.
 *
 * Two things move, and both are reporting rather than decorating:
 *
 *   - the strip **plots itself in** left to right on mount, in the drafting
 *     idiom the rest of the console is laid out in;
 *   - the live segment **fills over its own `durationInSeconds`**, so you can
 *     see how far through the current slide the board is. The fill element is
 *     keyed on the frame key, so when telemetry reports a new frame React
 *     remounts it and the CSS animation restarts from zero -- no timers, and
 *     no drift between the bar and the data.
 *
 * An auto-timed frame that is live gets a solid fill and no progress, because
 * the board sizes it at render time and its length genuinely is not knowable
 * from here. Animating a guess would be the same lie the hatching exists to
 * avoid.
 *
 * @param {object}   props
 * @param {Array}    props.frames      the assembled payload's frames
 * @param {string}   [props.currentKey] telemetry's `displayedFrameKey`
 * @param {'sm'|'md'} [props.size]     `sm` is the bare band, for a fleet row
 */
export default function RotationStrip({ frames = [], currentKey, size = 'md', className = '' }) {
  if (frames.length === 0) {
    return (
      <div
        className={`h-2 hatch border border-hair ${className}`}
        title="No frames in rotation"
        aria-label="No frames in rotation"
      />
    );
  }

  // Auto-timed frames still need a width to occupy. The mean of the fixed
  // durations is the least misleading guess available, and the hatching says
  // out loud that it is a guess. Falls back to 15s when every frame is auto.
  const fixed = frames.map((f) => f.durationInSeconds).filter((d) => d > 0);
  const nominal = fixed.length ? Math.round(fixed.reduce((a, b) => a + b, 0) / fixed.length) : 15;

  const widths = frames.map((f) => (f.durationInSeconds > 0 ? f.durationInSeconds : nominal));
  const total = widths.reduce((a, b) => a + b, 0);

  const fixedTotal = fixed.reduce((a, b) => a + b, 0);
  const autoCount = frames.length - fixed.length;

  if (size === 'sm') {
    return (
      <div
        className={`flex h-1.5 gap-px ${className}`}
        role="img"
        aria-label={`${frames.length} frames in rotation`}
      >
        {frames.map((frame, i) => {
          const live = currentKey && frame.key === currentKey;
          const auto = !(frame.durationInSeconds > 0);
          return (
            <span
              key={frame.key ?? i}
              style={{ width: `${(widths[i] / total) * 100}%`, '--i': i }}
              className={`anim-draw relative overflow-hidden ${
                live ? 'bg-ember-dim' : auto ? 'hatch bg-surface' : 'bg-line-loud'
              }`}
            >
              {live && (
                <span
                  key={currentKey}
                  className="absolute inset-0 origin-left bg-ember"
                  style={
                    auto
                      ? undefined
                      : { animation: `minbar-draw ${frame.durationInSeconds}s linear both` }
                  }
                />
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex h-9 gap-px" role="img" aria-label={`${frames.length} frames in rotation`}>
        {frames.map((frame, i) => {
          const live = currentKey && frame.key === currentKey;
          const auto = !(frame.durationInSeconds > 0);
          const share = (widths[i] / total) * 100;
          const label = frameTypeLabel(frame.frameType);
          return (
            <div
              key={frame.key ?? i}
              style={{ width: `${share}%`, '--i': i }}
              title={`${label} · ${auto ? 'auto' : `${frame.durationInSeconds}s`}`}
              className={[
                'anim-draw relative flex items-center justify-center overflow-hidden',
                'transition-colors duration-[--dur-fast]',
                live
                  ? 'bg-ember text-on-ember'
                  : auto
                    ? 'hatch bg-surface text-soft'
                    : 'bg-raised text-soft hover:bg-overlay',
              ].join(' ')}
            >
              {/* Progress through the current slide, as a rule along the
                  bottom edge rather than a fill behind the label -- a fill
                  sweeping under the text would put it on two different
                  backgrounds and fail contrast on one of them. Keyed on the
                  frame so a new frame from telemetry remounts it and restarts
                  the animation. */}
              {live && !auto && (
                <span
                  key={currentKey}
                  aria-hidden
                  className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-on-ember/55"
                  style={{ animation: `minbar-draw ${frame.durationInSeconds}s linear both` }}
                />
              )}

              {/* Only label a segment wide enough to hold a word. The rest are
                  identified by hover; crushed 3px text is worse than none. */}
              {share > 11 && (
                <span className="cap relative px-1.5 truncate" style={{ color: 'inherit' }}>
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Dimension line: tick, span, tick — the cycle length, called out the way
          a drawing calls out a measured distance. */}
      <div className="flex items-center gap-2 mt-2 text-muted anim-in" style={{ animationDelay: '260ms' }}>
        <span className="w-px h-2 bg-line-loud shrink-0" />
        <span className="flex-1 border-t border-hair" />
        <span className="val text-[11px] whitespace-nowrap">
          {fixedTotal}s
          {autoCount > 0 && (
            <span className="text-faint">
              {' '}
              + {autoCount} auto
            </span>
          )}
        </span>
        <span className="flex-1 border-t border-hair" />
        <span className="w-px h-2 bg-line-loud shrink-0" />
      </div>
    </div>
  );
}

/** Legend, for the one place that needs to explain the hatching. */
export function RotationLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 cap ${className}`}>
      <span className="flex items-center gap-2">
        <span className="w-5 h-2 bg-ember" />
        on screen now
      </span>
      <span className="flex items-center gap-2">
        <span className="w-5 h-2 bg-raised" />
        fixed duration
      </span>
      <span className="flex items-center gap-2">
        <span className="w-5 h-2 hatch bg-surface" />
        auto — sized by the board
      </span>
    </div>
  );
}
