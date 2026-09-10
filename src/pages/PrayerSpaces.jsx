import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit2,
  ExternalLink,
  Footprints,
  Lightbulb,
  MapPin,
  MapPinOff,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  PageHeader,
  Panel,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  KeyValue,
  Modal,
  SegmentedControl,
  Skeleton,
  useToast,
} from '../components/ui';
import PrayerSpaceEditor from '../components/board/PrayerSpaceEditor';
import PrayerSpaceService from '../services/PrayerSpaceService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import { AUDIENCE_LABELS, prayerSpaceTypeLabel } from '../models/board';

/**
 * "All" first, and the default: a console's job is to show you everything it
 * knows about, and the audience buttons are a filter over what is already in
 * hand rather than a different request. The old page refetched per audience
 * from the public endpoint, which meant the sisters' musallahs were simply
 * absent from a brothers-scoped load and nothing said so.
 */
const AUDIENCE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Everyone' },
  { value: 'brothers', label: AUDIENCE_LABELS.brothers },
  { value: 'sisters', label: AUDIENCE_LABELS.sisters },
];

const AUDIENCE_TONE = { brothers: 'cool', sisters: 'ember', both: 'quiet' };

/**
 * Prayer spaces, as the Minbar app sees them — and, now, as they are managed.
 *
 * The list comes from `/api/admin/minbar/prayer-spaces`, which is unfiltered:
 * every space regardless of who it is listed to. Editing is gated on
 * `board:prayerspace:write`; an account holding only `board:content:read` gets
 * this same page with no write controls rendered at all.
 *
 * The page's older strength is deliberately kept. It renders what a student
 * walking to Jummah would be shown, step by step, so a wrong entrance or a
 * stale walk time is visible here rather than reported from the hallway — and
 * now fixable in the same breath.
 */
export default function PrayerSpaces() {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can(PERMISSIONS.BOARD_PRAYER_SPACE_WRITE);

  const [spaces, setSpaces] = useState(null);
  const [error, setError] = useState(null);
  const [audience, setAudience] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  // null when closed, 'new' when creating, otherwise the record being edited.
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setSpaces(null);
    setError(null);
    try {
      setSpaces(await PrayerSpaceService.list());
    } catch (e) {
      setError(e.message);
      setSpaces([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (spaces ?? []).filter((s) => audience === 'all' || s.audience === audience),
    [spaces, audience]
  );

  /**
   * Open one space, refetching it on the way in.
   *
   * The list already carries every field, so this is not about filling gaps: it
   * is about the edit that may follow. A save sends the difference between the
   * form and this record, so the record wants to be as fresh as it can be —
   * anything changed since the page loaded is then something the diff leaves
   * alone rather than something it overwrites.
   */
  const open = async (space) => {
    setSelected(space);
    setDetail(null);
    try {
      setDetail(await PrayerSpaceService.get(space.id));
    } catch {
      setDetail(space);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  const edit = () => {
    const record = detail ?? selected;
    closeDetail();
    setEditing(record);
  };

  const onSaved = (record, created) => {
    setSpaces((list) => {
      const next = created
        ? [...(list ?? []), record]
        : (list ?? []).map((s) => (s.id === record.id ? record : s));
      // The endpoint lists by name; keeping the same order means a rename does
      // not leave the row it moved sitting where it used to be.
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditing(null);
  };

  const remove = async () => {
    await PrayerSpaceService.remove(deleting.id);
    setSpaces((list) => (list ?? []).filter((s) => s.id !== deleting.id));
    toast.success(`${deleting.name} deleted.`);
  };

  const shown = detail ?? selected;
  const hasPin = shown?.latitude != null && shown?.longitude != null;

  return (
    <>
      <PageHeader
        title="Prayer spaces"
        description="Where the app sends someone looking for a place to pray, down to the door they walk in through."
        actions={
          <>
            <SegmentedControl
              value={audience}
              onChange={setAudience}
              options={AUDIENCE_FILTERS}
            />
            {canWrite && (
              <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                New space
              </Button>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={load}>{error}</ErrorNote>
        </div>
      )}

      {!spaces ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-surface border border-hair rounded-lg shadow-sm p-5 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MapPin}
            title={spaces.length === 0 ? 'No prayer spaces yet' : 'None listed to this audience'}
            body={
              spaces.length === 0
                ? 'A space is a room, a walk time, and the turns you take to get there. The app has nothing to point anyone at until one exists.'
                : 'Every space is still here — the audience buttons above only filter this list.'
            }
            action={
              canWrite && spaces.length === 0 ? (
                <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                  New space
                </Button>
              ) : null
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((space, i) => (
            <button
              key={space.id}
              onClick={() => open(space)}
              style={{ '--i': Math.min(i, 12) }}
              className="anim-stagger text-left bg-surface border border-hair rounded-lg shadow-sm p-5
                         hover:border-line-loud hover:bg-raised/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] text-ink leading-snug">{space.name}</h3>
                <Badge tone={AUDIENCE_TONE[space.audience] ?? 'quiet'} size="sm">
                  {AUDIENCE_LABELS[space.audience] ?? space.audience}
                </Badge>
              </div>

              <p className="cap mt-2">
                {prayerSpaceTypeLabel(space.type)}
                {space.tag ? ` · ${space.tag}` : ''}
              </p>

              <div className="mt-4 space-y-1.5 text-[12px] text-muted">
                {space.building && (
                  <p className="flex items-center gap-2">
                    <Building2 size={12} className="shrink-0 text-faint" />
                    {space.building}
                    {space.floor ? `, ${space.floor}` : ''}
                  </p>
                )}
                {space.walkTimeMinutes != null && (
                  <p className="flex items-center gap-2">
                    <Footprints size={12} className="shrink-0 text-faint" />
                    {space.walkTimeMinutes} min walk
                    {space.startingPoint ? ` from ${space.startingPoint}` : ''}
                  </p>
                )}
                {space.capacity != null && (
                  <p className="flex items-center gap-2">
                    <Users size={12} className="shrink-0 text-faint" />
                    Fits about {space.capacity}
                  </p>
                )}
                {space.latitude == null && (
                  <p className="flex items-center gap-2 text-warn">
                    <MapPinOff size={12} className="shrink-0" />
                    No coordinates
                  </p>
                )}
              </div>

              {space.amenities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {space.amenities.slice(0, 4).map((amenity) => (
                    <Badge key={amenity} tone="quiet" size="sm">
                      {amenity}
                    </Badge>
                  ))}
                  {space.amenities.length > 4 && (
                    <Badge tone="quiet" size="sm">
                      +{space.amenities.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={closeDetail}
        caption={selected ? prayerSpaceTypeLabel(selected.type) : 'Prayer space'}
        title={selected?.name}
        size="lg"
        footer={
          <>
            {selected?.mapsUrl && (
              <a href={selected.mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" iconRight={ExternalLink}>
                  Open in Maps
                </Button>
              </a>
            )}
            {canWrite && (
              <>
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="text-faint hover:text-bad"
                  onClick={() => {
                    const record = detail ?? selected;
                    closeDetail();
                    setDeleting(record);
                  }}
                >
                  Delete
                </Button>
                <Button variant="primary" icon={Edit2} onClick={edit} disabled={!detail}>
                  Edit
                </Button>
              </>
            )}
          </>
        }
      >
        {shown && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="cap mb-2">Where</p>
              <KeyValue label="Building">{shown.building}</KeyValue>
              <KeyValue label="Floor">{shown.floor}</KeyValue>
              <KeyValue label="Room">{shown.roomInfo}</KeyValue>
              <KeyValue label="Entrance">{shown.entranceName}</KeyValue>
              <KeyValue label="Capacity">{shown.capacity}</KeyValue>
              <KeyValue label="Walk time">
                {shown.walkTimeMinutes != null ? `${shown.walkTimeMinutes} min` : null}
              </KeyValue>
              <KeyValue label="Listed to">
                {AUDIENCE_LABELS[shown.audience] ?? shown.audience}
              </KeyValue>
              <KeyValue label="Coordinates">
                {hasPin ? `${shown.latitude}, ${shown.longitude}` : null}
              </KeyValue>

              {!hasPin && (
                <p className="mt-3 flex items-start gap-2 text-[12px] text-warn leading-relaxed">
                  <MapPinOff size={13} className="mt-0.5 shrink-0" />
                  No coordinates recorded, so the app cannot drop a pin for this space or offer to
                  navigate to it. The written directions are all a student gets.
                </p>
              )}

              {shown.entranceDescription && (
                <p className="mt-4 text-[13px] text-soft leading-relaxed">
                  {shown.entranceDescription}
                </p>
              )}

              {shown.notes && (
                <p className="mt-3 text-[12.5px] text-muted leading-relaxed">{shown.notes}</p>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <p className="cap mb-2.5">
                  Directions{shown.startingPoint ? ` from ${shown.startingPoint}` : ''}
                </p>
                {detail === null ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ) : detail.steps.length > 0 ? (
                  <ol className="space-y-3">
                    {detail.steps.map((step, i) => (
                      <li key={step.id ?? i} className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-ember-dim text-ember
                                         grid place-items-center text-[10px] font-mono mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] text-ink leading-snug">{step.instruction}</p>
                          {step.subtext && (
                            <p className="text-[12px] text-muted mt-0.5">{step.subtext}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : detail.directions ? (
                  <p className="text-[13px] text-soft leading-relaxed whitespace-pre-line">
                    {detail.directions}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted">No directions recorded.</p>
                )}
              </div>

              {shown.amenities.length > 0 && (
                <div>
                  <p className="cap mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shown.amenities.map((amenity) => (
                      <Badge key={amenity} tone="quiet" size="sm">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {shown.tips.length > 0 && (
                <div>
                  <p className="cap mb-2">Tips</p>
                  <ul className="space-y-1.5">
                    {shown.tips.map((tip) => (
                      <li key={tip} className="flex gap-2 text-[12px] text-soft leading-relaxed">
                        <Lightbulb size={12} className="text-warn mt-0.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {canWrite && (
        <PrayerSpaceEditor
          open={editing !== null}
          space={editing === 'new' ? null : editing}
          onSaved={onSaved}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this prayer space?"
        confirmLabel="Delete"
        body={
          <>
            <span className="text-ink">{deleting?.name}</span> and its walking directions are
            removed, and the app stops listing it. Nothing else references a space, so this is
            only undone by typing it back in.
          </>
        }
      />
    </>
  );
}
