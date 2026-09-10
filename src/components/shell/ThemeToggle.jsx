import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import Menu, { MenuItem, MenuLabel } from '../ui/Menu';

/**
 * Light / Dark / System.
 *
 * Three choices rather than a two-state switch, because "System" is a real
 * answer and not the absence of one: a laptop that flips at sunset should take
 * the console with it, and collapsing that into a boolean means anyone who
 * wants it has to remember to come back here twice a day.
 *
 * The trigger shows what you are looking at (sun or moon), not what you picked.
 * On System those differ, and the icon's job is to be the thing you click when
 * the screen is wrong — so it has to match the screen.
 *
 * `next-themes` reports `undefined` until it has mounted and read storage, so
 * the first client render cannot know the answer. Rendering the moon during
 * that gap would flip it to a sun a frame later on every light-theme load, so
 * the button holds an empty box of the right size instead. It is one frame.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  const choices = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <Menu
      align="right"
      trigger={
        <button
          aria-label={`Theme: ${mounted ? (theme ?? 'system') : 'loading'}`}
          className={[
            'shrink-0 size-8 grid place-items-center rounded-md',
            'text-muted hover:bg-raised hover:text-ink transition-colors',
            className,
          ].join(' ')}
        >
          {mounted ? <Icon size={16} strokeWidth={2} /> : <span className="size-4" />}
        </button>
      }
    >
      <MenuLabel>Appearance</MenuLabel>
      {choices.map((c) => (
        <MenuItem key={c.id} icon={c.icon} onClick={() => setTheme(c.id)}>
          <span className="flex-1">{c.label}</span>
          {mounted && theme === c.id && <Check size={13} className="text-ember" />}
        </MenuItem>
      ))}
    </Menu>
  );
}
