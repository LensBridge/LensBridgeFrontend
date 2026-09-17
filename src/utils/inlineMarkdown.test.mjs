/**
 * Pins the inline-Markdown renderer.
 *
 * Two failure modes justify the file. The first is security: the output of
 * `renderInlineMarkdown` goes straight into `dangerouslySetInnerHTML` in
 * SocialFramePreview, and the input is copy an operator typed. If escaping ever
 * stops happening before emphasis is applied, a `<script>` in the hero text
 * becomes a script tag in the admin console and nothing visibly breaks.
 *
 * The second is quieter: the board renders this same Markdown, so a preview that
 * disagrees with the tokenizer is worse than no preview — it tells an operator
 * their frame is fine when it is not.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { escapeHtml, renderInlineMarkdown, stripInlineMarkdown } from './inlineMarkdown.js';

test('escapes every character with meaning in HTML', () => {
  assert.equal(escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapes ampersands once, not twice', () => {
  assert.equal(escapeHtml('a < b & c'), 'a &lt; b &amp; c');
});

test('renders the emphasis the board renders', () => {
  assert.equal(
    renderInlineMarkdown('Follow *your home on campus* today'),
    'Follow <em>your home on campus</em> today'
  );
  assert.equal(
    renderInlineMarkdown('Catch us on **Instagram**.'),
    'Catch us on <strong>Instagram</strong>.'
  );
});

test('nests bold inside italic without crossing the tags', () => {
  assert.equal(
    renderInlineMarkdown('*a **b** c*'),
    '<em>a <strong>b</strong> c</em>'
  );
});

test('escapes before it emphasises, so no operator markup survives', () => {
  assert.equal(
    renderInlineMarkdown('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );
  assert.equal(
    renderInlineMarkdown('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
  // An emphasis span cannot be used to smuggle an attribute out of an escape.
  assert.equal(
    renderInlineMarkdown('*<a href="javascript:alert(1)">x</a>*'),
    '<em>&lt;a href=&quot;javascript:alert(1)&quot;&gt;x&lt;/a&gt;</em>'
  );
});

test('emits no block-level markup, whatever the input looks like', () => {
  const html = renderInlineMarkdown('# Heading\n\n- item\n\n> quote\n\n![img](x)\n[link](y)');
  assert.equal(/<(?!\/?(?:em|strong)>)/.test(html), false, html);
  assert.match(html, /# Heading/);
});

test('leaves unmatched and whitespace-flanked asterisks alone', () => {
  assert.equal(renderInlineMarkdown('5 * 3 * 2'), '5 * 3 * 2');
  assert.equal(renderInlineMarkdown('half *open'), 'half *open');
  assert.equal(renderInlineMarkdown('**'), '**');
  assert.equal(renderInlineMarkdown('a ** b'), 'a ** b');
});

test('handles the empty and nullish cases the form produces', () => {
  assert.equal(renderInlineMarkdown(''), '');
  assert.equal(renderInlineMarkdown(null), '');
  assert.equal(renderInlineMarkdown(undefined), '');
});

test('strip drops the markers and agrees with the renderer about what is markup', () => {
  assert.equal(stripInlineMarkdown('Catch us on **Instagram**.'), 'Catch us on Instagram.');
  assert.equal(stripInlineMarkdown('Follow *your home on campus*'), 'Follow your home on campus');
  // Not markup in the renderer, so not stripped here either.
  assert.equal(stripInlineMarkdown('5 * 3 * 2'), '5 * 3 * 2');
  assert.equal(stripInlineMarkdown(null), '');
});

test('strip produces text, never HTML', () => {
  assert.equal(stripInlineMarkdown('<b>raw</b>'), '<b>raw</b>');
});
