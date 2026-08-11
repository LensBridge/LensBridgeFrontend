/**
 * Inline Markdown for operator-entered board copy.
 *
 * `headerText`, `heroText`, `handle` and `footerText` on a promoted social are
 * stored as Markdown and rendered to HTML by the kiosk. The admin preview has to
 * render the same emphasis or it is lying about what will go on the wall.
 *
 * This is not a Markdown parser and must never become one. The board only ever
 * uses inline emphasis -- `*italic*`, `**bold**` -- for phrases like
 * "*your home on campus*", so that is the entire supported grammar.
 *
 * The security rule is the order of operations: escape first, then emphasise.
 * Every `<`, `&` and quote in the operator's text is neutralised before any tag
 * is inserted, so the only markup that can reach `innerHTML` is the `<em>` and
 * `<strong>` this file writes itself. There is no raw-HTML passthrough and no
 * block-level construct -- a pasted `<script>` renders as the literal characters
 * the operator typed, which is also what they would expect to see.
 *
 * Consumers: SocialFramePreview (via `dangerouslySetInnerHTML`) and the list
 * rows (via `stripInlineMarkdown`, which produces no HTML at all).
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Neutralise every character with meaning in HTML.
 *
 * `&` has to be handled first, and is: a character class replaces each source
 * character exactly once, so the `&` introduced by `&lt;` is never revisited.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Delimiter length -> the pair of strings wrapped around the span. */
const HTML_TAGS = { 1: ['<em>', '</em>'], 2: ['<strong>', '</strong>'] };
const NO_TAGS = { 1: ['', ''], 2: ['', ''] };

/**
 * Turn `*` / `**` runs into emphasis spans.
 *
 * Delimiters are matched with a stack rather than by regex substitution. A pair
 * of `.replace()` passes gets `*a **b** c*` wrong -- it closes the `<em>` inside
 * the `<strong>` and emits overlapping tags -- and, worse, the second pass would
 * be scanning over markup the first pass had just inserted.
 *
 * Flanking follows CommonMark's rule in spirit: an opener cannot be followed by
 * whitespace and a closer cannot be preceded by it. Without that, "open 9 * 5
 * days * a week" silently italicises, which is the kind of surprise an operator
 * would only discover from across the room.
 *
 * A delimiter that never finds its partner is written back out as the literal
 * asterisks that were typed.
 *
 * @param {string} text already escaped whenever `tags` emits HTML
 * @param {Record<number, [string, string]>} tags what to wrap each span in
 * @returns {string}
 */
function emphasise(text, tags) {
  // The capture group keeps the delimiters as tokens of their own.
  const tokens = text.split(/(\*{1,2})/).filter((token) => token !== '');

  /** @type {string[]} output chunks; opener slots are filled in on close */
  const out = [];
  /** @type {{ length: number, slot: number }[]} */
  const openers = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token !== '*' && token !== '**') {
      out.push(token);
      continue;
    }

    const length = token.length;
    const before = tokens[i - 1] ? tokens[i - 1].slice(-1) : '';
    const after = tokens[i + 1] ? tokens[i + 1].charAt(0) : '';
    const canOpen = after !== '' && !/\s/.test(after);
    const canClose = before !== '' && !/\s/.test(before);

    let match = -1;
    if (canClose) {
      for (let j = openers.length - 1; j >= 0; j -= 1) {
        // `openers[j].slot < out.length` rejects an empty span, where the
        // opener is still the most recent thing pushed.
        if (openers[j].length === length && openers[j].slot < out.length) {
          match = j;
          break;
        }
      }
    }

    if (match !== -1) {
      // Anything opened inside the span being closed never found a partner.
      for (let j = openers.length - 1; j > match; j -= 1) {
        out[openers[j].slot] = '*'.repeat(openers[j].length);
      }
      const opener = openers[match];
      openers.length = match;
      const pair = tags[length];
      out[opener.slot] = pair[0];
      out.push(pair[1]);
      continue;
    }

    if (canOpen) {
      openers.push({ length, slot: out.length });
      out.push(''); // placeholder, filled in only if this delimiter closes
      continue;
    }

    out.push(token);
  }

  for (const opener of openers) {
    out[opener.slot] = '*'.repeat(opener.length);
  }

  return out.join('');
}

/**
 * Operator Markdown -> HTML that is safe to hand to `innerHTML`.
 *
 * @param {unknown} value
 * @returns {string} HTML containing only `<em>` and `<strong>`
 */
export function renderInlineMarkdown(value) {
  return emphasise(escapeHtml(value), HTML_TAGS);
}

/**
 * The same copy with its emphasis markers removed and no HTML at all.
 *
 * For list rows, `title` attributes, and anywhere else React renders the string
 * as a text node -- "Catch us on **Instagram**" should read as prose there, not
 * as source. Nothing is escaped because nothing is interpolated: the return
 * value is plain text and React escapes text nodes on the way in.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function stripInlineMarkdown(value) {
  if (value == null) return '';
  // The same tokenizer with empty wrappers, so this view and the rendered one
  // can never disagree about which asterisks are markup.
  return emphasise(String(value), NO_TAGS);
}
