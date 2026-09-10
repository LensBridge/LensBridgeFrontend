import { api } from '../api/client';

/**
 * TicketingService — the slice of tCketManage this console actually needs.
 *
 * tCketManage has its own admin UI; nothing here tries to replace it. The only
 * thing Minbar owns is the *link* between a board event and a ticketed event
 * (see BoardService.linkTicketEvent), and making that link means listing the
 * ticketed events so someone can pick one. That is the whole surface.
 *
 * Authorization: WebSecurityConfig puts every `/api/tcket/**` path behind
 * `tcket:manage` at the filter chain, before the controller's own capability
 * check runs. So a plain TCKET_SCANNER cannot read this list, and the picker is
 * gated on `tcket:manage` rather than on anything finer.
 */
class TicketingService {
  /**
   * Unwrap an openapi-fetch result, rethrowing the server's message. Same
   * contract as `BoardService.unwrap`, deliberately duplicated rather than
   * shared: ticketing is a separate service and this file should stay droppable.
   *
   * @template T
   * @param {{ data?: T, error?: { message?: string } }} result
   * @param {string} fallback
   * @returns {T}
   */
  static unwrap({ data, error }, fallback) {
    if (error) throw new Error(error.message || fallback);
    return /** @type {T} */ (data);
  }

  /**
   * `GET /api/tcket/events` takes a `Pageable` that springdoc documented as a
   * single object-typed query parameter — the controller is missing
   * `@ParameterObject` (see LensBridgeBackend/docs/API_CONTRACT.md).
   *
   * openapi-fetch's default serializer would render that object as
   * `pageable[page]=0&pageable[size]=50`, which Spring's Pageable resolver does
   * not read; it wants flat `page`/`size`/`sort`. So the parameter is typed as
   * the spec declares it and flattened on the way out.
   */
  static async listEvents({ page = 0, size = 50, sort = ['time,desc'] } = {}) {
    const result = await api.GET('/api/tcket/events', {
      params: { query: { pageable: { page, size, sort } } },
      querySerializer: ({ pageable }) => {
        const search = new URLSearchParams();
        search.set('page', String(pageable.page));
        search.set('size', String(pageable.size));
        for (const criterion of pageable.sort ?? []) search.append('sort', criterion);
        return search.toString();
      }
    });

    const page_ = this.unwrap(result, 'Failed to fetch ticketed events');
    return {
      content: (page_?.content ?? []).map((event) => this.fromBackendEvent(event)),
      totalElements: page_?.totalElements ?? 0,
      totalPages: page_?.totalPages ?? 0
    };
  }

  /** EventResponse -> the shape BoardService already exposes as `ticketEvent`. */
  static fromBackendEvent(event) {
    const timeEpochMs = event.time ? new Date(event.time).getTime() : null;
    return {
      id: event.id,
      name: event.name || '',
      location: event.location || '',
      description: event.description || '',
      timeEpochMs: Number.isNaN(timeEpochMs) ? null : timeEpochMs,
      zones: event.zones ?? []
    };
  }
}

export default TicketingService;
