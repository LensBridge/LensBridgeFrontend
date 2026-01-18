# Admin API - LensBridge Frontend

This document describes the recommended admin HTTP API endpoints used by the `BoardManagement` UI. All admin endpoints require authentication and the `ROLE_ROOT` permission unless noted otherwise.

## Auth
- POST /api/admin/login
  - Body: { email, password }
  - Response: { token, user: { id, name, roles } }

- GET /api/admin/me
  - Headers: `Authorization: Bearer <token>`
  - Response: { id, name, email, roles }

## Error / Validation format
- 4xx/5xx responses should follow:
  - { error: 'Short message', details?: { field?: 'message' } }

## Boards
- GET /api/admin/boards
  - Query: none
  - Response: [{ id, name, location, boardConfig, jummahSchedules, events, posters, frames, dailyContent }]

- GET /api/admin/boards/:boardId
  - Response: full board payload (same shape as used in UI)

- POST /api/admin/boards
  - Body: { name, location, boardConfig }
  - Response: created board object

- PUT /api/admin/boards/:boardId
  - Body: partial/full board fields to update
  - Response: updated board

- DELETE /api/admin/boards/:boardId
  - Response: { success: true }

## Board Config (settings)
- GET /api/admin/boards/:boardId/config
  - Response: boardConfig object

- PUT /api/admin/boards/:boardId/config
  - Body: boardConfig (e.g., timezone, frameDuration, darkModeAfterIsha, enableScrollingMessage, scrollingMessage, etc.)
  - Response: updated boardConfig

Notes: The UI expects `darkModeAfterIsha` as a boolean and other fields matching `board_models.js`.

## Jummah Schedules
(Jummah is modeled as `jummahSchedules: [{ id, date, isRecurring, prayers } ]` at board-level.)

- GET /api/admin/boards/:boardId/jummah-schedules
  - Response: array of schedules

- POST /api/admin/boards/:boardId/jummah-schedules
  - Body: { date (YYYY-MM-DD), isRecurring (bool), prayers: [{ time, khatib, location }] }
  - Response: created schedule

- PUT /api/admin/boards/:boardId/jummah-schedules/:scheduleId
  - Body: updated schedule
  - Response: updated schedule

- DELETE /api/admin/boards/:boardId/jummah-schedules/:scheduleId
  - Response: { success: true }

- POST /api/admin/boards/:boardId/jummah-schedules/:scheduleId/duplicate
  - Body: { targetDate (YYYY-MM-DD) } or server can auto-pick next available Friday
  - Response: duplicated schedule

Validation notes:
- `date` should be ISO date string (YYYY-MM-DD)
- `prayers` must be non-empty and max 5 items
- Audience is not required (prayers broadcast to both musallahs)

## Events
- GET /api/admin/boards/:boardId/events
  - Response: array of events

- POST /api/admin/boards/:boardId/events
  - Body: { name, startTimestamp, endTimestamp, location, description, allDay (bool), audience (optional: 'brothers'|'sisters'|'both') }
  - Response: created event

- PUT /api/admin/boards/:boardId/events/:eventId
  - Body: updated event
  - Response: updated event

- DELETE /api/admin/boards/:boardId/events/:eventId
  - Response: { success: true }

- PATCH /api/admin/boards/:boardId/events/order
  - Body: { order: [eventId, ...] }
  - Response: { success: true }

## Posters (slides)
- GET /api/admin/boards/:boardId/posters
  - Response: array of posters

- POST /api/admin/uploads
  - Purpose: return signed URL or direct-upload token for storing poster images/videos
  - Body: { filename, contentType, size }
  - Response: { uploadUrl, assetUrl, uploadId }
  - Note: UI uses returned `uploadUrl` to PUT the file, then calls create poster with `assetUrl`.

- POST /api/admin/boards/:boardId/posters
  - Body: { title, imageUrl (assetUrl), duration, startDate, endDate, audience (optional) }
  - Response: created poster

- PUT /api/admin/boards/:boardId/posters/:posterId
  - Body: updated poster
  - Response: updated poster

- DELETE /api/admin/boards/:boardId/posters/:posterId
  - Response: { success: true }

- PATCH /api/admin/boards/:boardId/posters/order
  - Body: { order: [posterId, ...] }
  - Response: { success: true }

Implementation note: Support both direct binary upload to cloud (signed URL) and server-side proxy if needed.

## Frames (slideshow / frame definitions)
- GET /api/admin/boards/:boardId/frames
  - Response: array of frame definitions

- POST /api/admin/boards/:boardId/frames
  - Body: { id, title, posterIds, layoutSettings }
  - Response: created frame

- PUT /api/admin/boards/:boardId/frames/:frameId
  - Body: updated frame
  - Response: updated frame

- DELETE /api/admin/boards/:boardId/frames/:frameId
  - Response: { success: true }

## Daily Content
- GET /api/admin/boards/:boardId/daily-content
  - Response: [{ date, frameDefinitions, activePosters }]

- PUT /api/admin/boards/:boardId/daily-content/:date
  - Body: { frameDefinitions, activePosters }
  - Response: updated day content

## Miscellaneous
- GET /api/admin/boards/:boardId/stats
  - Response: summary counts (frames, posters, events, jummahSchedules, upcomingToday)

- POST /api/admin/boards/:boardId/publish
  - Body: { target: 'now'|'schedule', scheduleTime? }
  - Response: { success: true }

## Permissions & Security
- All admin endpoints should validate the `Authorization` header and ensure the user has `ROLE_ROOT`.
- Rate-limit upload endpoints and validate filetypes/sizes.
- Validate date/time fields server-side using timezone-aware logic.

---

If you want, I can also generate a compact OpenAPI schema (YAML/JSON) from this spec to use for client generation. 