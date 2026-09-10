# Minbar Management Console

The admin console for everything Minbar runs: MusallahBoard content, the display
fleet, media submissions, and who is allowed to touch any of it.

This is a **management console and nothing else**. There is no gallery, no
upload form, and no signup — accounts are created by an administrator. The
public-facing app this repository used to be (LensBridge) is gone; what survived
is the moderation queue for the media people still submit.

Ticketing is not here either. tCketManage has its own console on its own
subdomain; the only thing this app owns is the link between a board event and a
ticketed event, which is one picker inside the events editor.

## Running it

```bash
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your backend
npm run dev               # http://localhost:5175
```

The backend is [LensBridgeBackend](https://github.com/LensBridge/LensBridgeBackend),
checked out beside this repo.

```bash
npm run build             # typecheck, then vite build
npm run lint
npm test                  # token-refresh + model unit tests
npm run api:generate      # regenerate src/api/schema.d.ts from the backend spec
npm run api:check         # fail if the committed client is stale
```

## Layout

```
src/
  api/          generated OpenAPI client + token storage. Never edit schema.d.ts.
  services/     one class per backend area; the only place fetch shapes live
  models/       backend contract constants (frame types, audiences, durations)
  utils/        permissions catalog, authorization helpers, formatting
  hooks/        device list / device detail / command stream (STOMP + polling)
  components/
    ui/         the design system — Button, Panel, DataTable, Modal, Toast, …
    shell/      the authenticated frame: sidebar, top bar, nav model
    brand/      the Minbar mark
    board/      content editors (events, posters, socials, weekly, slideshow)
    devices/    telemetry, command launcher, enrollment
    admin/      access editor, user creation, audit display maps
  pages/        one file per route
```

Two frames and nothing else: `AuthLayout` for the four screens you can reach
signed out, `ConsoleLayout` for everything else.

## Authorization

The server checks **permissions**, never role names — every `@PreAuthorize` is
`hasAuthority('domain:resource:verb')`. The console mirrors that exactly:

- `src/utils/permissions.js` is the catalog, mirrored from the backend enum.
- `<Can permission={…}>` hides a control the user cannot use.
- `<PermissionRoute anyOf={…}>` gates a route, and names the missing permission
  on the denial screen so people know what to ask for.
- `src/components/shell/nav.js` decides which sidebar entries exist.

Hiding a control is presentation, not security. The route gates repeat the nav's
permission lists on purpose — a bookmark reaches the route without touching the
sidebar.

Roles are named bundles and are display-only in this app. Gate on the permission
a control actually needs, so a BOARD_EDITOR gets the poster editor without also
being handed the reboot button.

## Design

The palette, type and mark are the **Ember** scheme from the Minbar brand project
(Claude Design `019e31dd`, `Minbar Logo Final.html` and `assets/README.txt`).

- **Ember (`#F26430`) is the only accent.** One per screen, on the primary
  action. A selected filter gets the tinted version (`bg-ember-dim`), an active
  nav item gets a tinted lozenge, and status uses its own narrow ramp. If you
  find yourself reaching for a second ember button, one of them is a
  `secondary`.
- Syne for display type and the wordmark, Montserrat for UI, IBM Plex Mono for
  the eyebrow labels and any data you might read back to someone.

### Two themes

The console ships light and dark, and the ramp is written so that adding the
second one meant redefining colour and nothing else.

- **Light** is the default and takes its structure from tCketManage: a white
  nav column, a 54px title bar, cards on a light neutral ground. Its surfaces
  are deliberately neutral — a warm tint at 96% lightness turns muddy and
  fights ember.
- **Dark** keeps those surfaces neutral and goes to near-black (`#0C0C0E`).
  The brand sheet does have a dark-first scheme built on the warm `#1C1210`,
  and it is what the kiosk runs on — but a hue that reads as "warm black"
  behind a photograph reads as orange across a full console page. Ember stays
  the only thing on screen carrying chroma.

Token names are semantic, not literal, which is what lets both themes share
them: `ground` is the app background and `raised` is one step toward the viewer
in either. Light values live in `@theme` in `src/index.css`; dark values are a
`.dark` block that redefines the same names. **Type, radii, motion and the shell
metrics are not part of a theme** — a dark mode that also moves things is two
changes wearing one name.

Two things in that file are worth knowing before you edit it:

- The `dark` variant is repointed at a class (`@custom-variant`), not
  `prefers-color-scheme`, because "System" has to be a choice among three
  rather than the absence of a choice. `next-themes` owns the class, a blocking
  script in `index.html` applies it before first paint, and the storage key is
  spelled in both places.
- `--shadow-*` values reference `--sh-*` variables instead of literal rgba.
  Tailwind compiles a resolved colour into the shadow utility, so a literal
  would not follow the theme; a nested `var()` survives compilation and does.

A handful of values must **not** flip — the app-icon shell is near-black
artwork, and a QR code needs a light field under it whichever way the console
is running. Those use the `--color-deep` / `--color-cream` brand constants.

Tokens live in `@theme` in `src/index.css`. The mark's geometry — a 7.5-unit
stroke, r24 arc across a 26–74 span, detached platform bar at y84 — is in
`src/components/brand/MinbarMark.jsx`, which also enforces the two brand rules
worth enforcing in code: stroke thickens as the mark shrinks, and below 24px it
switches to the rounded icon shell.

## Backend gaps

See [NOTES-FOR-BACKEND.md](./NOTES-FOR-BACKEND.md) — the places where the
console cannot do something an operator will ask for, and the contract
workarounds it currently carries.
