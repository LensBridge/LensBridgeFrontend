import { useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Ticket } from 'lucide-react';
import TicketingService from '../../services/TicketingService';
import { Modal, Badge, SearchInput, EmptyState, ErrorNote, Skeleton } from '../ui';

const formatWhen = (epochMs) =>
  epochMs
    ? new Date(epochMs).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'No date set';

/**
 * Picks the tCketManage event to attach to a board event.
 *
 * The list is read straight from tCketManage rather than mirrored into Minbar:
 * ticketed events are created and edited in tCketManage's own console, and the
 * only decision made here is which one this board event points at. This is the
 * entire ticketing surface of the Minbar console, by design.
 *
 * `currentId` renders as already-linked rather than being hidden, so re-picking
 * the same event is visibly a no-op instead of looking like a missing row.
 */
export default function TicketEventPicker({ open, boardEventName, currentId, onSelect, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    TicketingService.listEvents()
      .then((page) => {
        if (!cancelled) setEvents(page.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter(
      (e) => e.name.toLowerCase().includes(needle) || e.location.toLowerCase().includes(needle)
    );
  }, [events, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      caption="tCketManage"
      title={`Attach tickets to ${boardEventName}`}
      size="md"
    >
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search ticketed events"
        className="mb-4"
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="space-y-2 max-h-[50vh] overflow-y-auto -mx-1 px-1">
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            compact
            icon={Ticket}
            title="No ticketed events"
            body={
              query
                ? 'Nothing matches that search.'
                : 'Ticketed events are created in tCketManage. Make one there first, then come back to link it.'
            }
          />
        )}

        {filtered.map((event) => {
          const isCurrent = event.id === currentId;
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              disabled={isCurrent}
              className={`w-full text-left rounded-md border px-4 py-3 transition-colors ${
                isCurrent
                  ? 'bg-ember-haze border-ember/40 cursor-default'
                  : 'bg-raised border-hair hover:border-line-loud hover:bg-overlay'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-ink">{event.name}</span>
                {isCurrent && (
                  <Badge tone="ember" size="sm">
                    Linked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-[12px] text-muted mt-1 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock size={11} className="text-faint" />
                  {formatWhen(event.timeEpochMs)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-faint" />
                    {event.location}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
