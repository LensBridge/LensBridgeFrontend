import { Globe, Instagram, Youtube } from 'lucide-react';

/**
 * Platform marks for promoted socials.
 *
 * lucide-react is already the console's icon set and it ships Instagram and
 * YouTube, so those come straight from it. It has never carried TikTok or
 * WhatsApp, and adding a second icon package for two glyphs is not worth the
 * dependency — they are drawn below in Lucide's own idiom (24x24 box, no fill,
 * `currentColor` stroke at width 2, round caps and joins) so the five marks sit
 * together without one of them looking pasted in. `other` gets a globe: it is
 * deliberately *not* a brand mark, because the entry is not a known brand.
 *
 * Accessibility: every icon here is `aria-hidden`. An icon is not a label, and
 * each call site pairs it with the platform name as visible text (list rows,
 * the platform picker) or with an accessible name on the control that holds it.
 * Do not use this component as the only identification of a platform.
 */

function TikTok(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Note head + stem, then the hook that folds back over the top right. */}
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function WhatsApp(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Speech bubble with the tail at bottom-left, and the handset inside. */}
      <path d="M3 21l1.7-3.9A9 9 0 1 1 8.1 20.3z" />
      <path d="M9.5 9.2v.9a4.4 4.4 0 0 0 4.4 4.4h.9" />
    </svg>
  );
}

const ICONS = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: TikTok,
  whatsapp: WhatsApp,
  other: Globe
};

/**
 * @param {{ type?: string, className?: string }} props
 */
function SocialIcon({ type, className = 'h-4 w-4' }) {
  const Icon = ICONS[type] || ICONS.other;
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}

export default SocialIcon;
