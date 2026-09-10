import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, KeyRound, MoreHorizontal, ShieldCheck, UserPlus, Users } from 'lucide-react';
import {
  PageHeader,
  Panel,
  DataTable,
  Badge,
  Button,
  Pagination,
  EmptyState,
  ErrorNote,
  SearchInput,
  Menu,
  MenuItem,
  useToast,
} from '../components/ui';
import Can from '../components/Can';
import CreateUserModal from '../components/admin/CreateUserModal';
import AccessEditor from '../components/admin/AccessEditor';
import IamService from '../services/IamService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import { bareRoleName } from '../components/admin/roles';
import AudienceBadge from '../components/board/AudienceBadge';

const PAGE_SIZE = 25;

const ROLE_TONE_BADGE = { ROOT: 'bad', BOARD_ADMIN: 'ember', TCKET_ADMIN: 'ember', USER: 'quiet' };

/**
 * The people directory.
 *
 * Search filters the page in hand rather than the whole directory, because
 * `GET /api/admin/users` binds only a Pageable — there is no `q` parameter and
 * the one the old console sent was silently discarded server-side. The input is
 * labelled honestly rather than removed: at the size this organisation runs, a
 * page of 25 usually is the directory. Past a few hundred accounts it stops
 * being adequate and needs backend support; see NOTES-FOR-BACKEND.md.
 */
export default function People() {
  const { can, permissions: held } = useAuth();
  const toast = useToast();

  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        setResult(await IamService.listUsers({ page: targetPage, size: PAGE_SIZE }));
      } catch (e) {
        setError(e.message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    if (can(PERMISSIONS.IAM_USER_READ)) IamService.listRoles().then(setRoles).catch(() => {});
    if (can(PERMISSIONS.IAM_ROLE_GRANT))
      IamService.listPermissions().then(setCatalog).catch(() => {});
  }, [can]);

  const rows = useMemo(() => {
    const all = result?.content ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((u) =>
      [u.firstName, u.lastName, u.email, ...(u.roles ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [result, query]);

  /** Re-reads the page and re-points the open editor at the refreshed record. */
  const refresh = useCallback(
    async (userId) => {
      const next = await IamService.listUsers({ page, size: PAGE_SIZE });
      setResult(next);
      if (userId) {
        const updated = next.content.find((u) => u.id === userId);
        if (updated) setEditing(updated);
      }
    },
    [page]
  );

  const createUser = async (body) => {
    try {
      const data = await IamService.createUser(body);
      toast.success(data?.message || 'Account created.');
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  };

  const verify = async (user) => {
    try {
      await IamService.verifyUser(user.id);
      toast.success('Account verified.');
      await refresh(user.id);
    } catch (e) {
      toast.error('Could not verify the account.', { detail: e.message });
    }
  };

  /**
   * Role and permission writes return the server's own message either way. Those
   * refusals name the rule that was broken, so they go straight back to the
   * editor rather than being flattened into "request failed".
   */
  const setRole = async (roleName, direction) => {
    try {
      const data = await IamService.setRole(editing.id, roleName, direction);
      await refresh(editing.id);
      return { ok: true, message: data?.message || 'Roles updated.' };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  };

  const setPermission = async (permissionName, grant) => {
    try {
      const data = await IamService.setPermission(editing.id, permissionName, grant);
      await refresh(editing.id);
      return { ok: true, message: data?.message || 'Permissions updated.' };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Person',
      render: (u) => (
        <div className="min-w-0">
          <p className="text-[13px] text-ink truncate">
            {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed'}
          </p>
          <p className="val text-[11px] text-faint truncate">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? []).length === 0 ? (
            <span className="text-[12px] text-faint">None</span>
          ) : (
            u.roles.map((role) => {
              const bare = bareRoleName(role);
              return (
                <Badge key={role} tone={ROLE_TONE_BADGE[bare] ?? 'cool'} size="sm">
                  {bare}
                </Badge>
              );
            })
          )}
        </div>
      ),
    },
    {
      key: 'grants',
      header: 'Grants',
      width: '9rem',
      render: (u) => {
        const effective = u.effectivePermissions?.length ?? 0;
        const direct = u.directPermissions?.length ?? 0;
        return (
          <span className="text-[12px] text-muted tabular">
            {effective}
            {direct > 0 && <span className="text-ember"> · {direct} direct</span>}
          </span>
        );
      },
    },
    {
      key: 'audience',
      header: 'Audience',
      width: '7rem',
      render: (u) =>
        u.audience ? <AudienceBadge audience={u.audience} /> : <span className="text-faint">—</span>,
    },
    {
      key: 'verified',
      header: 'Status',
      width: '7rem',
      render: (u) =>
        u.verified ? (
          <Badge tone="good" size="sm" icon={BadgeCheck}>
            Verified
          </Badge>
        ) : (
          <Badge tone="warn" size="sm">
            Unverified
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '3rem',
      align: 'right',
      render: (u) => (
        <Menu
          trigger={
            <Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="Actions" />
          }
        >
          <Can anyOf={[PERMISSIONS.IAM_USER_READ, PERMISSIONS.IAM_ROLE_GRANT]}>
            <MenuItem icon={ShieldCheck} onClick={() => setEditing(u)}>
              Manage access
            </MenuItem>
          </Can>
          <Can permission={PERMISSIONS.IAM_USER_WRITE}>
            <MenuItem icon={KeyRound} disabled={u.verified} onClick={() => verify(u)}>
              {u.verified ? 'Already verified' : 'Mark verified'}
            </MenuItem>
          </Can>
        </Menu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone with a console account. Roles are bundles; a direct grant is one permission handed to one person."
        actions={
          <Can permission={PERMISSIONS.IAM_USER_WRITE}>
            <Button variant="primary" icon={UserPlus} onClick={() => setCreating(true)}>
              New account
            </Button>
          </Can>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={() => load(page)}>{error}</ErrorNote>
        </div>
      )}

      <Panel
        padded={false}
        caption={result ? `${result.totalElements} accounts` : 'Loading'}
        title="Directory"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Filter this page"
            className="w-56"
          />
        }
        footer={
          result && (
            <Pagination
              page={result.page}
              size={result.size}
              totalPages={result.totalPages}
              totalElements={result.totalElements}
              onChange={setPage}
            />
          )
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          skeletonRows={8}
          empty={
            <EmptyState
              icon={Users}
              title={query ? 'Nobody on this page matches' : 'No accounts'}
              body={
                query
                  ? 'Search only covers the page you are on — the server has no user search endpoint. Try another page, or clear the filter.'
                  : undefined
              }
            />
          }
        />
      </Panel>

      {query && result && result.totalPages > 1 && (
        <p className="mt-3 text-[12px] text-muted">
          Filtering {rows.length} of the {result.content.length} accounts on this page. There is no
          server-side user search, so other pages are not covered.
        </p>
      )}

      <CreateUserModal open={creating} onClose={() => setCreating(false)} onSubmit={createUser} />

      <AccessEditor
        open={!!editing}
        onClose={() => setEditing(null)}
        user={editing}
        roles={roles}
        permissions={catalog}
        heldPermissions={held}
        onSetRole={setRole}
        onSetPermission={setPermission}
      />
    </>
  );
}
