import { api } from '../api/client';

/**
 * The media submission queue.
 *
 * This is the surviving half of what used to be LensBridge: the console no
 * longer accepts uploads or renders a public gallery, but somebody still has to
 * decide which submissions reach a board. So the read paths and the four
 * moderation verbs are here, and nothing else is.
 *
 * The four verbs are deliberately asymmetric on the wire — approve and feature
 * are POSTs to a sub-path, un-approve and un-feature are DELETEs of the
 * corresponding sub-resource. That is the server's contract; `setApproved` and
 * `setFeatured` below hide it so call sites can just pass a boolean.
 */
class MediaService {
  /** @template T @param {{data?: T, error?: {message?: string}}} r @param {string} fallback @returns {T} */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  /**
   * One page of submissions.
   *
   * `filter` picks the endpoint rather than adding a query param, because the
   * server exposes each state as its own path. `all` is the only one that shows
   * rejected and pending together, so it is the default for the queue view.
   *
   * @param {{ filter?: 'all'|'pending'|'approved'|'featured', page?: number,
   *           size?: number, sort?: string[] }} [options]
   */
  static async list({ filter = 'all', page = 0, size = 24, sort = ['createdDate,desc'] } = {}) {
    /** @type {Record<string, '/api/admin/board/uploads'|'/api/admin/board/uploads/pending'|'/api/admin/board/uploads/approved'|'/api/admin/board/uploads/featured'>} */
    const paths = {
      all: '/api/admin/board/uploads',
      pending: '/api/admin/board/uploads/pending',
      approved: '/api/admin/board/uploads/approved',
      featured: '/api/admin/board/uploads/featured',
    };

    const data = this.unwrap(
      await api.GET(paths[filter], { params: { query: { page, size, sort } } }),
      'Failed to load submissions'
    );

    return {
      content: data?.content ?? [],
      page: data?.number ?? page,
      size: data?.size ?? size,
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 0,
    };
  }

  static async setApproved(uploadId, approved) {
    const result = approved
      ? await api.POST('/api/admin/board/uploads/{uploadId}/approve', {
          params: { path: { uploadId } },
        })
      : await api.DELETE('/api/admin/board/uploads/{uploadId}/approval', {
          params: { path: { uploadId } },
        });
    return this.unwrap(result, approved ? 'Failed to approve' : 'Failed to un-approve');
  }

  static async setFeatured(uploadId, featured) {
    const result = featured
      ? await api.POST('/api/admin/board/uploads/{uploadId}/feature', {
          params: { path: { uploadId } },
        })
      : await api.DELETE('/api/admin/board/uploads/{uploadId}/featured', {
          params: { path: { uploadId } },
        });
    return this.unwrap(result, featured ? 'Failed to feature' : 'Failed to un-feature');
  }

  /** Permanent. The record and the stored object both go. */
  static async remove(uploadId) {
    return this.unwrap(
      await api.DELETE('/api/admin/board/uploads/{uploadId}', { params: { path: { uploadId } } }),
      'Failed to delete submission'
    );
  }
}

export default MediaService;
