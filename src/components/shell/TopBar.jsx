import { Menu as MenuIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/**
 * The strip above the content.
 *
 * 54px, white, one hairline underneath — the same bar tCketManage runs across
 * the top of its dashboard, and it carries the same thing: where you are on
 * the left, environment on the right.
 *
 * The account control moved out of here and into the foot of the nav rail.
 * Two reasons: it is where the sibling console keeps it, and the bar is now
 * short enough that a truncating email address beside a page title made both
 * harder to read than either alone.
 *
 * The section name sits above the page name rather than beside it with a
 * slash. At 54px there is room for two lines, and the stacked pair reads as a
 * location instead of a file path.
 */
export default function TopBar({ onOpenNav, crumb }) {
  return (
    <header
      className="sticky top-0 z-20 h-[var(--bar-h)] shrink-0 flex items-center gap-3 px-4 sm:px-6
                 bg-surface border-b border-hair"
    >
      <button
        onClick={onOpenNav}
        className="lg:hidden shrink-0 size-8 -ml-1 grid place-items-center rounded-md
                   text-muted hover:bg-raised hover:text-ink transition-colors"
        aria-label="Open navigation"
      >
        <MenuIcon size={18} />
      </button>

      <div className="min-w-0">
        {crumb?.section && <div className="cap truncate">{crumb.section}</div>}
        <div className="text-[14px] font-semibold tracking-[-0.01em] text-ink truncate leading-tight">
          {crumb?.label ?? 'Console'}
        </div>
      </div>

      <div className="flex-1" />

      {/*
        Which backend am I pointed at. It was a line in the sidebar footer,
        which is exactly where nobody looks before running a command against a
        fleet. Up here it is in the same glance as the page title, and only
        development gets colour — a badge that is always lit stops being read.
      */}

      {/*
        Appearance sits here rather than in the account menu at the foot of the
        rail. It is not an account setting — it is stored per browser, not on
        the user — and it is the one control people reach for because the room
        they are in changed, which is not a moment to go looking through a menu.
      */}
      <ThemeToggle className="-mr-1" />
    </header>
  );
}
