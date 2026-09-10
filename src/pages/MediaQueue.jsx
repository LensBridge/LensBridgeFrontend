import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Star,
  Trash2,
  Undo2,
  UserRound,
} from 'lucide-react';
import {
  PageHeader,
  Panel,
  Tabs,
  Badge,
  Button,
  Pagination,
  EmptyState,
  ErrorNote,
  Modal,
  KeyValue,
  CopyButton,
  ConfirmDialog,
  Skeleton,
  Tooltip,
  useToast,
} from '../components/ui';
import Can from '../components/Can';
import MediaService from '../services/MediaService';
import AuditService from '../services/AuditService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import { formatDateTime, formatRelativeTime } from '../utils/deviceStatus';
import { describeAction } from '../components/admin/audit';

const PAGE_SIZE = 24;

const KIND_ICON = { image: ImageIcon, video: Film, audio: Music, document: FileText };

/**
 * Who actually sent a submission in.
 *
 * `anon` is a board-rendering flag, not a promise to the console. The upload is
 * still tied to an account, and a moderator deciding whether a photo goes on a
 * wall in a prayer room needs to know whose photo it is — an anonymous
 * submission is exactly the one you most want attributable if it turns out to
 * be a problem. So the name is shown either way here, and the flag becomes a
 * badge saying the *boards* will stay quiet about it.
 *
 * Account name leads, because that is the identity the People page and the
 * audit log use. The chosen display name follows only when it differs, since
 * for most submissions the two are the same string.
 *
 * `identified` is false when the server sent nothing to attribute — which for
 * an anon upload is a redaction rather than missing data, and the detail pane
 * says so.
 */
function uploaderIdentity(upload) {
  const account = upload.uploaderFullName?.trim();
  const alias = upload.displayName?.trim();
  const name = account || alias || upload.uploaderEmail?.trim() || null;
  return {
    name,
    alias: alias && alias !== account ? alias : null,
    identified: !!name,
  };
}

/**
 * The media moderation queue.
 *
 * This is all that survives of the old public app: people still submit photos
 * from the Minbar app, and somebody still decides which of them reaches a
 * screen in a prayer room. The console no longer accepts uploads itself, and
 * there is no public gallery — only this.
 *
 * Cards rather than table rows, because the thing being judged is an image.
 * Approve and feature are separate decisions on the server and stay separate
 * here: approving clears a submission for the gallery, featuring puts it on a
 * board, and the second without the first is a state the API allows and someone
 * will eventually create by accident.
 */
export default function MediaQueue() {
  const { can } = useAuth();
  const toast = useToast();
  const moderate = can(PERMISSIONS.MEDIA_UPLOAD_MODERATE);

  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [inspecting, setInspecting] = useState(null);
  const [history, setHistory] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(
    async (targetFilter = filter, targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        setResult(await MediaService.list({ filter: targetFilter, page: targetPage, size: PAGE_SIZE }));
      } catch (e) {
        setError(e.message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [filter, page]
  );

  useEffect(() => {
    load(filter, page);
  }, [load, filter, page]);

  const changeFilter = (next) => {
    setFilter(next);
    setPage(0);
  };

  /** Runs a moderation verb, then reloads so counts and membership stay honest. */
  const act = async (upload, label, run) => {
    setBusyId(upload.uuid);
    try {
      await run();
      toast.success(label);
      await load(filter, page);
    } catch (e) {
      toast.error('That did not go through.', { detail: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const inspect = async (upload) => {
    setInspecting(upload);
    setHistory(null);
    if (can(PERMISSIONS.AUDIT_READ)) {
      AuditService.forUpload(upload.uuid).then(setHistory).catch(() => setHistory([]));
    }
  };

  const items = result?.content ?? [];

  return (
    <>
      <PageHeader
        title="Submissions"
        description="Photos and video sent in from the Minbar app. Approving clears a submission; featuring is what puts it on a board."
      />

      <Tabs
        className="mb-5"
        value={filter}
        onChange={changeFilter}
        tabs={[
          { id: 'pending', label: 'Awaiting review' },
          { id: 'approved', label: 'Approved' },
          { id: 'featured', label: 'Featured' },
          { id: 'all', label: 'Everything' },
        ]}
      />

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={() => load(filter, page)}>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-surface border border-hair rounded-lg shadow-sm overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ImageIcon}
            title={filter === 'pending' ? 'The queue is clear' : 'Nothing here'}
            body={
              filter === 'pending'
                ? 'Everything is accounted for. Congratulations!'
                : 'Try a different tab.'
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((upload, i) => {
            const Icon = KIND_ICON[upload.contentType] ?? FileText;
            const busy = busyId === upload.uuid;
            const who = uploaderIdentity(upload);
            return (
              <article
                key={upload.uuid}
                style={{ '--i': Math.min(i, 12) }}
                className={`anim-stagger bg-surface border rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors ${
                  upload.featured ? 'border-ember/45' : 'border-hair'
                }`}
              >
                <button
                  onClick={() => inspect(upload)}
                  className="relative block aspect-[4/3] bg-raised overflow-hidden group"
                >
                  {upload.thumbnailUrl || upload.contentType === 'image' ? (
                    <img
                      src={upload.thumbnailUrl || upload.secureUrl || upload.fileUrl}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-faint">
                      <Icon size={30} strokeWidth={1.3} />
                    </span>
                  )}

                  <span className="absolute top-2 left-2 flex gap-1.5">
                    {upload.featured && (
                      <Badge tone="ember" size="sm" icon={Star}>
                        Featured
                      </Badge>
                    )}
                    {upload.approved ? (
                      !upload.featured && (
                        <Badge tone="good" size="sm">
                          Approved
                        </Badge>
                      )
                    ) : (
                      <Badge tone="warn" size="sm">
                        Pending
                      </Badge>
                    )}
                  </span>

                  {upload.contentType && upload.contentType !== 'image' && (
                    <span className="absolute bottom-2 right-2">
                      <Badge tone="neutral" size="sm" icon={Icon}>
                        {upload.contentType}
                      </Badge>
                    </span>
                  )}
                </button>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[13px] text-ink leading-snug line-clamp-2">
                    {upload.uploadDescription || upload.fileName || 'Untitled submission'}
                  </p>

                  <p className="mt-2 text-[12px] text-muted flex items-center gap-1.5 min-w-0">
                    <UserRound size={11} className="shrink-0 text-faint" />
                    <span className={`truncate ${who.identified ? '' : 'text-faint'}`}>
                      {who.name ?? 'Not attributed'}
                    </span>
                    {who.alias && (
                      <span className="truncate text-faint">&ldquo;{who.alias}&rdquo;</span>
                    )}
                    {upload.anon && (
                      <Tooltip content="Sent anonymously. The boards will not show a name — this console does.">
                        <span className="shrink-0 inline-flex">
                          <Badge tone="quiet" size="sm" icon={EyeOff}>
                            Anon
                          </Badge>
                        </span>
                      </Tooltip>
                    )}
                  </p>

                  {upload.eventName && (
                    <p className="mt-1 text-[12px] text-faint truncate">{upload.eventName}</p>
                  )}

                  <p className="mt-1 text-[11px] text-faint tabular">
                    {formatRelativeTime(upload.createdDate)}
                  </p>

                  {moderate && (
                    <div className="mt-4 pt-3 border-t border-hair flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={upload.approved ? 'ghost' : 'primary'}
                        icon={upload.approved ? Undo2 : CheckCircle2}
                        loading={busy}
                        onClick={() =>
                          act(
                            upload,
                            upload.approved ? 'Approval withdrawn.' : 'Approved.',
                            () => MediaService.setApproved(upload.uuid, !upload.approved)
                          )
                        }
                      >
                        {upload.approved ? 'Un-approve' : 'Approve'}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Star}
                        loading={busy}
                        className={upload.featured ? 'text-ember' : undefined}
                        aria-label={upload.featured ? 'Un-feature' : 'Feature'}
                        title={upload.featured ? 'Remove from the boards' : 'Put on the boards'}
                        onClick={() =>
                          act(
                            upload,
                            upload.featured ? 'No longer featured.' : 'Featured on the boards.',
                            () => MediaService.setFeatured(upload.uuid, !upload.featured)
                          )
                        }
                      />

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        className="ml-auto text-faint hover:text-bad"
                        aria-label="Delete"
                        onClick={() => setPendingDelete(upload)}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={result.page}
            size={result.size}
            totalPages={result.totalPages}
            totalElements={result.totalElements}
            onChange={setPage}
          />
        </div>
      )}

      <Modal
        open={!!inspecting}
        onClose={() => setInspecting(null)}
        size="xl"
        caption={inspecting ? formatDateTime(inspecting.createdDate) : ''}
        title={inspecting?.uploadDescription || inspecting?.fileName || 'Submission'}
        footer={
          inspecting && (
            <>
              <a
                href={inspecting.secureUrl || inspecting.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" iconRight={ExternalLink}>
                  Open original
                </Button>
              </a>
              <Can permission={PERMISSIONS.MEDIA_UPLOAD_MODERATE}>
                <Button
                  variant={inspecting.approved ? 'secondary' : 'primary'}
                  icon={inspecting.approved ? Undo2 : CheckCircle2}
                  onClick={async () => {
                    await act(
                      inspecting,
                      inspecting.approved ? 'Approval withdrawn.' : 'Approved.',
                      () => MediaService.setApproved(inspecting.uuid, !inspecting.approved)
                    );
                    setInspecting(null);
                  }}
                >
                  {inspecting.approved ? 'Un-approve' : 'Approve'}
                </Button>
              </Can>
            </>
          )
        }
      >
        {inspecting && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 bg-raised rounded-lg overflow-hidden grid place-items-center min-h-[16rem]">
              {inspecting.contentType === 'video' ? (
                <video
                  src={inspecting.secureUrl || inspecting.fileUrl}
                  controls
                  className="w-full max-h-[60vh]"
                />
              ) : inspecting.contentType === 'audio' ? (
                <audio src={inspecting.secureUrl || inspecting.fileUrl} controls className="w-full p-6" />
              ) : (
                <img
                  src={inspecting.secureUrl || inspecting.fileUrl || inspecting.thumbnailUrl}
                  alt=""
                  className="max-h-[60vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="lg:col-span-2">
              <p className="cap mb-2">Submission</p>
              <KeyValue label="State">
                <span className="flex justify-end gap-1.5">
                  <Badge tone={inspecting.approved ? 'good' : 'warn'} size="sm">
                    {inspecting.approved ? 'Approved' : 'Pending'}
                  </Badge>
                  {inspecting.featured && (
                    <Badge tone="ember" size="sm">
                      Featured
                    </Badge>
                  )}
                  {inspecting.anon && (
                    <Badge tone="quiet" size="sm" icon={EyeOff}>
                      Anon
                    </Badge>
                  )}
                </span>
              </KeyValue>
              <KeyValue label="Event">{inspecting.eventName}</KeyValue>
              <KeyValue label="File" mono>
                {inspecting.fileName}
              </KeyValue>
              <KeyValue label="Type">{inspecting.contentType}</KeyValue>
              <KeyValue label="Submitted">{formatDateTime(inspecting.createdDate)}</KeyValue>

              <p className="cap mt-5 mb-2">Submitter</p>
              {inspecting.anon && (
                <p className="text-[12px] text-warn mb-2">
                  Sent anonymously. The boards will not show a name; the account behind it is
                  below, and stays between moderators.
                </p>
              )}
              {inspecting.anon && !uploaderIdentity(inspecting).identified && (
                <p className="text-[12px] text-muted mb-2">
                  The server returned no account for this one. Its audit history is the only
                  remaining thread back to a person.
                </p>
              )}
              <KeyValue label="Account">{inspecting.uploaderFullName}</KeyValue>
              <KeyValue label="Display name">{inspecting.displayName}</KeyValue>
              <KeyValue label="Email">
                {inspecting.uploaderEmail && (
                  <span className="inline-flex items-center gap-2">
                    <span className="val">{inspecting.uploaderEmail}</span>
                    <CopyButton value={inspecting.uploaderEmail} label="" />
                  </span>
                )}
              </KeyValue>
              <KeyValue label="Student no.">{inspecting.uploaderStudentNumber}</KeyValue>
              <KeyValue label="Instagram">{inspecting.instagramHandle}</KeyValue>
              <KeyValue label="Account id">{inspecting.uploadedBy}</KeyValue>

              <Can permission={PERMISSIONS.AUDIT_READ}>
                <p className="cap mt-5 mb-2">History</p>
                {history === null ? (
                  <Skeleton className="h-3 w-2/3" />
                ) : history.length === 0 ? (
                  <p className="text-[12px] text-muted">No recorded actions.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((entry) => (
                      <li key={entry.id} className="text-[12px]">
                        <span className="text-ink">{describeAction(entry.action)}</span>
                        <span className="text-muted">
                          {' '}
                          by{' '}
                          {entry.adminName ?? (
                            <span className="val">{entry.adminEmail || 'system'}</span>
                          )}{' '}
                          ·{' '}
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Can>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          await MediaService.remove(pendingDelete.uuid);
          toast.success('Submission deleted.');
          setInspecting(null);
          await load(filter, page);
        }}
        title="Delete this submission?"
        confirmLabel="Delete permanently"
        body={
          <>
            The record and the stored file both go, and neither comes back. If you only want it off
            the boards, un-feature it instead.
          </>
        }
      />
    </>
  );
}
