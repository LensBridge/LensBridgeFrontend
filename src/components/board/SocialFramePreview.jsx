import { memo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { renderInlineMarkdown, stripInlineMarkdown } from '../../utils/inlineMarkdown';
import { socialTypeLabel } from '../../models/board';

/**
 * A scaled-down rendering of the board's "Stay Connected" frame.
 *
 * The point is that an operator can see what they are about to publish without
 * walking to a musallah. It is not pixel-exact — it cannot be, because the kiosk
 * sizes everything against a 1920x1080 stage viewed from across a room, and
 * proportionally scaling a 12px eyebrow into a 700px panel yields 4px of
 * unreadable grey. Every type size below is therefore `max(<floor>, <n>cqw)`:
 * the proportion holds while the panel is large, and small panels stop shrinking
 * before the copy stops being copy.
 *
 * Colours are the literal oklch values from the board's `day` theme rather than
 * Tailwind classes. That theme is a separate repo's design system with a
 * documented token contract; approximating it with `bg-sky-100` would drift the
 * moment either side changed. Kept in one map so a theme change is one diff.
 *
 * Markdown: `headerText`, `heroText`, `handle` and `footerText` are stored as
 * Markdown and the board renders their inline emphasis, so this does too — via
 * `renderInlineMarkdown`, which escapes before it emphasises. Nothing else in
 * this file writes to `innerHTML`.
 *
 * Sources: MusallahBoard `src/components/slides.jsx` (IGSlide),
 *          `src/styles.css` (.ig-*, .slide-eyebrow, .qr-panel),
 *          `src/themes/day.css` (tokens).
 */

/** The board's `day` theme, verbatim. See MusallahBoard themes/_contract.css. */
const THEME = {
  bg: 'oklch(0.94 0.028 254)',
  bgSoft: 'oklch(0.89 0.046 254)',
  bgCard: 'oklch(0.91 0.040 254)',
  fg: 'oklch(0.303 0.095 257.1)',
  fg2: 'oklch(0.40 0.085 256)',
  fg3: 'oklch(0.50 0.050 256)',
  line: 'oklch(0.79 0.055 254)',
  accent: 'oklch(0.50 0.10 90)'
};

// The board's display face is Cinzel, which the console does not load. Naming it
// first costs nothing and pays off on any machine that has it; the fallbacks are
// all old-style serifs so the headline reads as the same kind of voice either way.
const DISPLAY = "'Cinzel', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const BODY = "'Montserrat', ui-sans-serif, system-ui, sans-serif";

/** Inline emphasis, escaped first. The only `innerHTML` in this component. */
function markdown(value) {
  return { __html: renderInlineMarkdown(value) };
}

/**
 * Placeholder copy for a field the operator has not filled in yet.
 *
 * Rendered at low opacity so it cannot be mistaken for content that will ship.
 * The alternative — collapsing the line — makes a half-filled form look like a
 * broken frame, which is a worse lie.
 */
function Ghost({ children, style }) {
  return <span style={{ opacity: 0.35, fontStyle: 'italic', ...style }}>{children}</span>;
}

/** http/https only: the QR is scanned by a phone camera, which opens nothing else. */
function isScannable(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return false;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function SocialFramePreview({ social, className = '' }) {
  const {
    type = 'other',
    url = '',
    headerText = '',
    heroText = '',
    handle = '',
    footerText = ''
  } = social || {};

  const trimmedHandle = (handle || '').trim();
  const scannable = isScannable(url);

  return (
    <figure
      className={`relative w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm ${className}`}
      style={{
        aspectRatio: '16 / 9',
        // Everything inside sizes against this box, not the viewport, so the
        // same component works in the form column and in the full-screen modal.
        containerType: 'inline-size',
        background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgSoft} 100%)`,
        color: THEME.fg,
        fontFamily: BODY,
        margin: 0
      }}
    >
      <div
        className="absolute inset-0 flex flex-col"
        style={{ padding: 'max(14px, 4.4cqw) max(16px, 5cqw)' }}
      >
        {/* Top rule: pip, hairline, then the frame's standing label. */}
        <div
          className="flex items-center"
          style={{ gap: 'max(6px, 1.4cqw)', marginBottom: 'max(10px, 2.8cqw)' }}
        >
          <span
            style={{
              width: 'max(5px, 1.05cqw)',
              height: 'max(5px, 1.05cqw)',
              transform: 'rotate(45deg)',
              background: THEME.accent,
              borderRadius: '1px',
              flexShrink: 0
            }}
          />
          <span
            style={{
              flex: 1,
              height: '1px',
              opacity: 0.45,
              background: `linear-gradient(90deg, ${THEME.accent}, transparent)`
            }}
          />
          <span
            style={{
              fontSize: 'max(8px, 1.1cqw)',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: THEME.accent,
              whiteSpace: 'nowrap'
            }}
          >
            Stay Connected
          </span>
        </div>

        <div
          className="min-h-0 flex-1 items-center"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 'max(14px, 4.5cqw)'
          }}
        >
          <div
            className="flex min-w-0 flex-col"
            style={{ gap: 'max(5px, 1.7cqw)' }}
          >
            <div
              style={{
                fontSize: 'max(8px, 1.1cqw)',
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: THEME.fg3
              }}
            >
              {headerText.trim()
                ? <span dangerouslySetInnerHTML={markdown(headerText)} />
                : <Ghost>Header text</Ghost>}
            </div>

            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 'max(19px, 5cqw)',
                lineHeight: 0.98,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: THEME.fg,
                // Line breaks the operator typed are honoured as line breaks,
                // without any block-level markup reaching innerHTML.
                whiteSpace: 'pre-line'
              }}
            >
              {heroText.trim()
                ? <span dangerouslySetInnerHTML={markdown(heroText)} />
                : <Ghost>Hero headline</Ghost>}
            </div>

            {/* Absent, not blank: a handle-less platform leaves no gap behind. */}
            {trimmedHandle && (
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 'max(12px, 2.4cqw)',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                  color: THEME.fg
                }}
                dangerouslySetInnerHTML={markdown(trimmedHandle)}
              />
            )}

            <div
              style={{
                fontSize: 'max(9px, 1.4cqw)',
                lineHeight: 1.45,
                color: THEME.fg2,
                maxWidth: '34em'
              }}
            >
              {footerText.trim()
                ? <span dangerouslySetInnerHTML={markdown(footerText)} />
                : <Ghost>Descriptive paragraph shown under the headline.</Ghost>}
            </div>
          </div>

          {/* QR card: gold corner brackets around a white plate. */}
          <div
            className="relative flex flex-col items-center"
            style={{
              padding: 'max(10px, 2.6cqw)',
              background: THEME.bgCard,
              border: `1px solid ${THEME.line}`,
              borderRadius: 'max(8px, 1.6cqw)',
              gap: 'max(6px, 1.3cqw)'
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 'max(5px, 1.3cqw)',
                left: 'max(5px, 1.3cqw)',
                width: 'max(6px, 1.3cqw)',
                height: 'max(6px, 1.3cqw)',
                borderTop: `2px solid ${THEME.accent}`,
                borderLeft: `2px solid ${THEME.accent}`
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 'max(5px, 1.3cqw)',
                right: 'max(5px, 1.3cqw)',
                width: 'max(6px, 1.3cqw)',
                height: 'max(6px, 1.3cqw)',
                borderBottom: `2px solid ${THEME.accent}`,
                borderRight: `2px solid ${THEME.accent}`
              }}
            />

            <div
              className="grid place-items-center"
              style={{
                width: 'max(74px, 18.5cqw)',
                height: 'max(74px, 18.5cqw)',
                background: '#fff',
                // The quiet zone is not decoration: a QR drawn straight onto the
                // card colour does not scan.
                padding: 'max(4px, 0.9cqw)',
                borderRadius: '6px'
              }}
            >
              {scannable ? (
                <QRCodeSVG
                  value={url.trim()}
                  size={512}
                  level="M"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              ) : (
                <span
                  className="grid h-full w-full place-items-center rounded text-center"
                  style={{
                    border: `1px dashed ${THEME.line}`,
                    color: THEME.fg3,
                    fontSize: 'max(7px, 1cqw)',
                    letterSpacing: '0.08em',
                    padding: '0.4em'
                  }}
                >
                  Add a link
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: 'max(7px, 1cqw)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: THEME.fg3,
                textAlign: 'center'
              }}
            >
              Scan with your camera
            </span>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        {`Board preview of the ${socialTypeLabel(type)} frame. `}
        {`Eyebrow: ${stripInlineMarkdown(headerText) || 'not set'}. `}
        {`Headline: ${stripInlineMarkdown(heroText) || 'not set'}. `}
        {trimmedHandle ? `Handle: ${stripInlineMarkdown(trimmedHandle)}. ` : 'No handle shown. '}
        {`Body: ${stripInlineMarkdown(footerText) || 'not set'}. `}
        {scannable ? `QR code links to ${url.trim()}.` : 'No scannable link set yet.'}
      </figcaption>
    </figure>
  );
}

export default memo(SocialFramePreview);
