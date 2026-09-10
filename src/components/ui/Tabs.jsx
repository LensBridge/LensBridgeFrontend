import { Tabs as Root, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';

/**
 * Horizontal tab strip.
 *
 * Radix underneath, for arrow-key navigation and the `tablist`/`tab` roles —
 * the hand-rolled version was a row of buttons with `aria-current`, which
 * screen readers announce as a list of links rather than a set of views.
 *
 * The look is unchanged and is not shadcn's: their `TabsList` is a filled
 * rounded pill group, which at this size reads as a segmented button and gets
 * clicked expecting something to happen beyond a view change. An ember rule
 * under the active label says "you are looking at this" without promising an
 * action. `TabsList`'s background and padding are stripped to get there.
 *
 * Tabs whose `hidden` flag is set are dropped rather than disabled — these are
 * permission gates, and showing someone a tab they can never open is an
 * invitation to file a bug.
 *
 * Content stays outside: every page here switches on `value` itself, because
 * the panels are whole editors that should not all be mounted at once.
 */
export default function Tabs({ tabs, value, onChange, className = '' }) {
  const visible = tabs.filter((t) => !t.hidden);

  return (
    <Root value={value} onValueChange={onChange} className={className}>
      <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0 border-b border-hair">
        {visible.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === value;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'flex flex-none items-center gap-2 px-3.5 py-2.5 -mb-px whitespace-nowrap',
                'text-[12.5px] font-medium rounded-none border-0 border-b-2 shadow-none',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                active
                  ? 'text-ink border-ember'
                  : 'text-muted border-transparent hover:text-soft hover:border-line'
              )}
            >
              {Icon && <Icon size={13} strokeWidth={2} />}
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    'val px-1.5 py-px rounded-xs text-[10px]',
                    active ? 'bg-ember-dim text-ember' : 'bg-raised text-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Root>
  );
}
