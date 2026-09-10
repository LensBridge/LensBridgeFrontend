import {
  Tooltip as Root,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';

/**
 * A label that appears on hover or focus.
 *
 * New with the Radix migration. Before this the console leaned on the native
 * `title` attribute — on rotation-strip segments, on icon-only buttons, on the
 * throttle chips. `title` never appears for keyboard users, has a ~1s delay
 * nobody can configure, and is not announced by most screen readers, so every
 * icon-only control was effectively unlabelled for anyone not using a mouse.
 *
 * Only for naming a control or expanding an abbreviation. Anything a person has
 * to read to make a decision belongs on the page, not behind a hover.
 *
 * `tip` is its own token rather than a step on the surface ramp because the two
 * themes want opposite things from it: on white a tooltip inverts to near-black,
 * and on the dark theme inverting would put a cream chip on a #1C1210 page,
 * which is a flashbulb. Dark lifts instead. The border is what closes the chip
 * once it is no longer inverted, and is harmless in the theme that is.
 */
export default function Tooltip({ content, side = 'top', children, delay = 250 }) {
  if (!content) return children;
  return (
    <Root delayDuration={delay}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className="bg-tip text-on-tip border border-hair rounded-sm px-2 py-1 text-[11.5px] shadow-lg"
      >
        {content}
      </TooltipContent>
    </Root>
  );
}

export { TooltipProvider };
