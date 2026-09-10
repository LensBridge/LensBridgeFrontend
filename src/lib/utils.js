import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * Plain string concatenation does not do this: `"px-4" + " px-2"` leaves both
 * in the attribute and the winner is decided by their order in the stylesheet,
 * not in the string. That is the bug that made every hand-rolled variant in the
 * old primitives need its border colour picked rather than appended.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
