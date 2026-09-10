import { api } from '../api/client';

/**
 * Users, roles, and direct permission grants.
 *
 * Two representations of a permission are in play and they are not
 * interchangeable: the **authority** (`board:poster:write`) is what appears on a
 * user and what the console checks, while the **enum name**
 * (`BOARD_POSTER_WRITE`) is what the grant and revoke endpoints accept. The
 * catalog from `listPermissions` carries both; pass the enum name to
 * `grantPermission` and `revokePermission`.
 *
 * The four grant calls return the server's own refusal text rather than a
 * generic failure. Those refusals name the rule that was broken — "cannot grant
 * a permission you do not hold", "last holder of iam:role:grant" — and that
 * sentence is the entire value of the response.
 */
class IamService {
  /** @template T @param {{data?: T, error?: {message?: string}}} r @param {string} fallback @returns {T} */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  /**
   * One page of users.
   *
   * `GET /api/admin/users` binds only a Pageable — there is no server-side
   * search. Filtering happens in the browser over the page in hand, which is
   * honest at a few hundred accounts and wrong beyond that; see the backend
   * notes in NOTES-FOR-BACKEND.md.
   */
  static async listUsers({ page = 0, size = 25, sort = ['firstName,asc'] } = {}) {
    const data = this.unwrap(
      await api.GET('/api/admin/users', { params: { query: { page, size, sort } } }),
      'Failed to load users'
    );
    return {
      content: data?.content ?? [],
      page: data?.number ?? page,
      size: data?.size ?? size,
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 0,
    };
  }

  /** Role bundles, each with its description and the permissions it confers. */
  static async listRoles() {
    return this.unwrap(await api.GET('/api/admin/roles', {}), 'Failed to load roles') ?? [];
  }

  /** The full permission catalog, for the direct-grant picker. */
  static async listPermissions() {
    return this.unwrap(await api.GET('/api/admin/permissions', {}), 'Failed to load permissions') ?? [];
  }

  /**
   * Create an account for someone else.
   *
   * Omit `password` — the normal case — and the account is created disabled and
   * the person is emailed a reset link; following it is what enables them. Set
   * one only when the account has to work immediately, which also means no
   * email is sent and you are now responsible for handing over the secret.
   */
  static async createUser(body) {
    return this.unwrap(await api.POST('/api/admin/user/create', { body }), 'Failed to create user');
  }

  static async verifyUser(userId) {
    return this.unwrap(
      await api.POST('/api/admin/user/verify', { body: { userId } }),
      'Failed to verify user'
    );
  }

  /** @param {'add'|'remove'} direction @param {string} roleName bare enum name, e.g. BOARD_EDITOR */
  static async setRole(userId, roleName, direction) {
    const path =
      direction === 'add'
        ? '/api/admin/user/{userId}/add-role'
        : '/api/admin/user/{userId}/remove-role';
    return this.unwrap(
      // Body is a bare JSON string naming the role enum constant. The value
      // comes from GET /admin/roles, so it is server-supplied; the cast only
      // satisfies the generated literal union.
      await api.POST(path, { params: { path: { userId } }, body: /** @type {never} */ (roleName) }),
      'Failed to change roles'
    );
  }

  /** @param {string} permissionName bare enum name, e.g. BOARD_POSTER_WRITE */
  static async setPermission(userId, permissionName, grant) {
    const path = grant
      ? '/api/admin/user/{userId}/grant-permission'
      : '/api/admin/user/{userId}/revoke-permission';
    return this.unwrap(
      // Same shape as setRole: a bare JSON string naming the enum constant,
      // sourced from GET /admin/permissions.
      await api.POST(path, {
        params: { path: { userId } },
        body: /** @type {never} */ (permissionName),
      }),
      'Failed to change permissions'
    );
  }
}

export default IamService;
