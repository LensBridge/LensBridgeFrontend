import { api } from '../api/client';

/**
 * The audit log.
 *
 * Five read endpoints, each its own path rather than a filter parameter on one:
 * everything, by action, by date range, failures only, and by upload. `query`
 * below picks between them from a single filter object so the log page can own
 * one piece of state instead of five.
 *
 * Note that reading the log is itself an audited action (`VIEW_AUDIT_LOGS`), so
 * the page deliberately does not poll.
 */
class AuditService {
  /** @template T @param {{data?: T, error?: {message?: string}}} r @param {string} fallback @returns {T} */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  static shape(data, page, size) {
    return {
      content: data?.content ?? [],
      page: data?.number ?? page,
      size: data?.size ?? size,
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 0,
    };
  }

  /** The action types the server will accept as a filter. */
  static async listActions() {
    return this.unwrap(await api.GET('/api/admin/audit/actions', {}), 'Failed to load actions') ?? [];
  }

  /**
   * @param {object} [filter]
   * @param {string} [filter.action]      one action type, as the enum name
   * @param {boolean} [filter.failedOnly] only operations that did not succeed
   * @param {string} [filter.start]       ISO date-time, inclusive
   * @param {string} [filter.end]         ISO date-time, inclusive
   * @param {number} [filter.page]
   * @param {number} [filter.size]
   * @param {string[]} [filter.sort]
   */
  static async query({ action, failedOnly, start, end, page = 0, size = 25, sort = ['timestamp,desc'] } = {}) {
    const query = { page, size, sort };
    let result;

    if (start && end) {
      result = await api.GET('/api/admin/audit/daterange', {
        params: { query: { ...query, start, end } },
      });
    } else if (failedOnly) {
      result = await api.GET('/api/admin/audit/failed', { params: { query } });
    } else if (action) {
      result = await api.GET('/api/admin/audit/action/{action}', {
        // The path param is the `AuditAction` enum name. It reaches here from
        // GET /audit/actions, so the value is server-supplied and valid; the
        // cast is only to satisfy the generated literal union.
        params: { path: { action: /** @type {never} */ (action) }, query },
      });
    } else {
      result = await api.GET('/api/admin/audit', { params: { query } });
    }

    return this.shape(this.unwrap(result, 'Failed to load the audit log'), page, size);
  }

  /** Every audited action against one upload — the provenance trail for a takedown. */
  static async forUpload(uploadId) {
    return this.unwrap(
      await api.GET('/api/admin/audit/upload/{uploadId}', { params: { path: { uploadId } } }),
      'Failed to load upload history'
    ) ?? [];
  }
}

export default AuditService;
