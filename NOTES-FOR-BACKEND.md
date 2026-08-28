# Gaps found while building the Minbar console

Written against `LensBridgeBackend/openapi.yaml` as of 2026-08-24, while
rebuilding this repo into a pure management console. Everything below is a place
where the console either cannot do something an operator will ask for, or has to
work around the contract to do it. Ordered roughly by how much it hurts.

None of this blocks the console shipping — each item has a workaround or an
honest "not possible from here" message in the UI. They are worth a look when
you're back.

---

## 1. There is no user search

`GET /api/admin/users` binds only a `Pageable`. There is no `q`, no `email`, no
`role` filter. The old console *sent* a `search` param and Spring discarded it
server-side, so user search has never worked — it just looked like it did.

The new People page filters the page in hand and labels the input "Filter this
page", with a line under the table saying other pages are not covered. That is
honest at 34 accounts. It stops being adequate somewhere around 200.

Cheapest fix: an optional `q` on the existing endpoint matching against
`firstName`, `lastName` and `email`.

## 2. There is no "fetch one user"

No `GET /api/admin/users/{userId}`. After a role grant or a permission revoke,
the console has to re-request the whole page it is on and pick the row back out
by id, purely to re-render one modal. See `refresh(userId)` in
`src/pages/People.jsx`.

Also: the four grant endpoints return a `MessageResponse`, not the updated
`UserInfoResponse`. Returning the user would remove the refetch entirely.

## 3. Audit filters do not compose

Five endpoints — `/audit`, `/audit/action/{action}`, `/audit/daterange`,
`/audit/failed`, `/audit/upload/{uploadId}` — and each ignores the others'
criteria. "Failed permission grants in the last week", which is the query you
actually want during an incident, cannot be expressed.

The console models this honestly: the scope is a single mutually-exclusive
choice and picking one clears the rest, because a row of checkboxes that
silently override each other is worse than a limitation you can see.

One `GET /api/admin/audit` taking optional `action`, `start`, `end`,
`succeeded`, `adminId` and `targetEntityId` would replace all five.

Related: `AuditAction` has an `EXPORT_DATA` constant but there is no export
endpoint, so nothing can ever emit it.

## 4. Audit actions exist for operations that have no endpoint

`AuditAction` declares `DISABLE_USER`, `ENABLE_USER`, `UNVERIFY_USER`,
`RESET_USER_PASSWORD`, `PROMOTE_USER`, `DEMOTE_USER`, `REMOVE_USER` and
`EXPORT_DATA`. None of them have a corresponding admin endpoint.

The console can create a user and verify one. It cannot disable a compromised
account, un-verify a mistaken verification, or force a password reset — the
three things you actually want at 2am. Right now the answer is "edit the
database".

`POST /api/admin/user/{userId}/disable` and `/enable` would be the highest-value
two.

## 5. Media moderation has no bulk operations

Approving a batch of forty photos after an event is forty round trips, each one
audited separately. `POST /api/admin/board/uploads/approve` taking a list of
ids would collapse that, and would make the audit log readable afterwards
("approved 40 uploads" instead of forty identical lines).

## 6. Board content lists are unbounded

`/api/admin/board/events`, `/posters`, `/socials` and `/weekly-content` all
return bare arrays. Events in particular only ever grow — by the third year
that's a several-hundred-element response on every load of the Content page, and
the console has to filter and sort the whole thing client-side.

`/uploads` and `/users` already return `Page*`; these should too, or at least
take a date window.

## 7. `GET /api/tcket/events` documents its Pageable wrong

The controller is missing `@ParameterObject`, so springdoc writes the `Pageable`
into the spec as a single object-typed query parameter. A generated client
serializes that as `pageable[page]=0&pageable[size]=50`, which Spring's resolver
does not read — it wants flat `page`/`size`/`sort`.

Already noted in your own `docs/API_CONTRACT.md`. `TicketingService.listEvents`
carries a custom `querySerializer` to flatten it. That workaround can go the
moment the annotation lands.

## 8. `FrameType` serializes as one thing and is documented as another

`FrameType` overrides `toString()` to return lowercase snake_case, and that is
what springdoc wrote into the spec (`poster`). Jackson serializes enums with
`name()` unless told otherwise, and nothing tells it otherwise — so the wire
format is `POSTER`.

`normalizeFrameType` in `src/models/board.js` accepts both, so whichever side
gets fixed the console keeps working. But the contract is currently lying, and
anyone generating a client from it and trusting the enum will get an unlabelled
grey box. `FrameSlot` has no custom `toString()` and is unaffected — which is
why the slot chip resolved while the type did not.

Either add `@JsonValue` to the lowercase form or drop the `toString()` override.

## 9. Audience enum case

`openapi.yaml` documents every `audience` as lowercase (`brothers`, `sisters`,
`both`) and the enum now serializes lowercase while still reading either case.
The console sends lowercase everywhere, including
`IssueEnrollmentTokenRequest` — the old enrollment page sent `BOTH`, which
worked only because of the lenient read. Worth confirming nothing else in the
system depends on the uppercase spelling before the leniency is removed.

## 10. Small things

- `GET /api/user/stats` does not exist, but the old Profile page called it on
  every load and swallowed the failure. Removed here; mentioning it in case
  another client still does.
- `POST /api/admin/user/create` takes `@RequestBody` without `@Valid`, so email
  format and field lengths are unchecked server-side. The console mirrors the
  column caps client-side, which is not the same as enforcing them.
- The four grant/revoke endpoints take a bare JSON string as the body
  (`"BOARD_EDITOR"`). It works, but it types badly in every generated client —
  `openapi-typescript` renders it as a literal union that no `string` satisfies,
  so `IamService` carries two casts. A one-field wrapper object would be
  friendlier.

---

## What the console deliberately does not do

For the avoidance of doubt, since these are absences by choice rather than gaps:

- **No ticketing screens.** tCketManage has its own console on its own
  subdomain. The only thing Minbar owns is the board-event to ticket-event
  *link*, which needs `GET /api/tcket/events` to populate a picker and nothing
  else. The sidebar links out.
- **No public surface.** No gallery, no submission form, no signup. Accounts are
  created by an administrator through `POST /api/admin/user/create`. If you want
  self-service signup back, `POST /api/auth/signup` is still live server-side —
  nothing in this app calls it.
