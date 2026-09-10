import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

/**
 * Page control for the server's zero-based `Page*` responses.
 *
 * Shows the element range rather than only the page number: "41–60 of 214"
 * answers "how much is left" without arithmetic, which is the question someone
 * paging a moderation queue is actually asking.
 */
export default function Pagination({ page, totalPages, totalElements, size, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;

  const first = page * size + 1;
  const last = Math.min((page + 1) * size, totalElements ?? (page + 1) * size);

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span className="text-[12px] text-muted tabular">
        {first}–{last}
        {totalElements != null && <> of {totalElements}</>}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          icon={ChevronLeft}
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        />
        <span className="text-[12px] text-soft tabular px-1">
          {page + 1} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={ChevronRight}
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        />
      </div>
    </div>
  );
}
