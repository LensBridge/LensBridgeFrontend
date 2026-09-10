import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Click-triggered dropdown.
 *
 * Radix underneath. The hand-rolled version this replaced opened and closed
 * correctly but was mouse-only: no arrow-key navigation, no typeahead, no
 * focus return to the trigger, and nothing announced to a screen reader. Every
 * menu in this console contains at least one write — the People row menu opens
 * the access editor and the account menu signs you out — so "reachable only by
 * pointer" was a real hole rather than a polish item.
 *
 * Still click-to-open, not hover: hover menus put destructive items under a
 * cursor that was only passing through.
 *
 * The public shape (`trigger`, `align`, children of `MenuItem`) is unchanged.
 */
export default function Menu({ trigger, children, align = 'right' }) {
  return (
    <DropdownMenu>
      {/* `asChild` onto the caller's own control, not onto a wrapper. Wrapping
          the trigger in a span put `aria-haspopup` and the keyboard handlers on
          the span while focus landed on the button inside it -- so a screen
          reader announced a plain button with no popup, which is worse than the
          hand-rolled version this was meant to improve on. React 19 passes
          `ref` as an ordinary prop, so a plain function component that spreads
          its rest props works here without forwardRef. */}
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align === 'right' ? 'end' : 'start'}
        sideOffset={6}
        className="min-w-[11rem] bg-overlay border-hair rounded-md p-1.5 shadow-lg"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenuItem({ icon: Icon, danger, disabled, children, onClick, ...rest }) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onClick}
      variant={danger ? 'destructive' : 'default'}
      className={cn(
        'gap-2.5 px-3 py-1.5 text-[12.5px] rounded-sm cursor-pointer',
        danger ? 'text-bad' : 'text-soft focus:text-ink'
      )}
      {...rest}
    >
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </DropdownMenuItem>
  );
}

export function MenuDivider() {
  return <DropdownMenuSeparator className="bg-hair my-1.5" />;
}

export function MenuLabel({ children }) {
  return <DropdownMenuLabel className="cap px-3 py-1.5">{children}</DropdownMenuLabel>;
}
