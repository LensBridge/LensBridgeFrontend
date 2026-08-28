import {
  LayoutDashboard,
  Images,
  MonitorSmartphone,
  MapPin,
  ShieldCheck,
  Users,
  ScrollText,
  CalendarRange,
  Ticket,
} from 'lucide-react';
import { PERMISSIONS } from '../../utils/permissions';

/**
 * The console's navigation model.
 *
 * One source of truth for the sidebar, the mobile drawer, and the breadcrumb —
 * three places that drifted apart in the old app because each hard-coded its own
 * list.
 *
 * Every entry declares `anyOf`: the permissions that make the destination worth
 * opening. An entry the signed-in user cannot satisfy is dropped from the nav
 * entirely; see `visibleSections`. Route guards repeat the same list, because
 * hiding a link is not authorization — someone can still type the URL.
 *
 * `end` marks a route that should only match exactly, so `/` does not light up
 * for every child path.
 */

/** External tools that live outside this console but belong in the same jump list. */
export const EXTERNAL_LINKS = [
  {
    id: 'tcket',
    label: 'tCketManage',
    icon: Ticket,
    // Ticketing has its own admin frontend on its own subdomain. Minbar owns
    // exactly one thing about it: the board-event to ticket-event link.
    href: import.meta.env.VITE_TCKET_CONSOLE_URL || 'https://tcket.utmmsa.ca',
    anyOf: [PERMISSIONS.TCKET_MANAGE, PERMISSIONS.TCKET_ADMIN],
  },
];

export const SECTIONS = [
  {
    id: 'overview',
    label: null,
    items: [
      {
        id: 'overview',
        label: 'Overview',
        to: '/',
        end: true,
        icon: LayoutDashboard,
        // Everyone who can sign in gets the overview; it renders only the cards
        // their grants cover, down to a bare welcome for an account with none.
        anyOf: null,
      },
    ],
  },
  {
    id: 'board',
    label: 'MusallahBoard',
    items: [
      {
        id: 'content',
        label: 'Content',
        to: '/board/content',
        icon: CalendarRange,
        anyOf: [
          PERMISSIONS.BOARD_CONTENT_READ,
          PERMISSIONS.BOARD_POSTER_WRITE,
          PERMISSIONS.BOARD_EVENT_WRITE,
          PERMISSIONS.BOARD_WEEKLY_WRITE,
          PERMISSIONS.BOARD_SOCIAL_WRITE,
        ],
      },
      {
        id: 'displays',
        label: 'Displays',
        to: '/board/displays',
        icon: MonitorSmartphone,
        anyOf: [PERMISSIONS.BOARD_DEVICE_READ, PERMISSIONS.BOARD_CONFIG_READ],
      },
      {
        id: 'spaces',
        label: 'Prayer spaces',
        to: '/board/spaces',
        icon: MapPin,
        anyOf: [PERMISSIONS.BOARD_CONTENT_READ, PERMISSIONS.BOARD_PRAYER_SPACE_WRITE],
      },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      {
        id: 'moderation',
        label: 'Submissions',
        to: '/media',
        icon: Images,
        anyOf: [PERMISSIONS.MEDIA_UPLOAD_READ, PERMISSIONS.MEDIA_UPLOAD_MODERATE],
      },
    ],
  },
  {
    id: 'access',
    label: 'Access',
    items: [
      {
        id: 'people',
        label: 'People',
        to: '/access/people',
        icon: Users,
        anyOf: [PERMISSIONS.IAM_USER_READ, PERMISSIONS.IAM_USER_WRITE, PERMISSIONS.IAM_ROLE_GRANT],
      },
      {
        id: 'roles',
        label: 'Roles',
        to: '/access/roles',
        icon: ShieldCheck,
        anyOf: [PERMISSIONS.IAM_USER_READ, PERMISSIONS.IAM_ROLE_GRANT],
      },
      {
        id: 'audit',
        label: 'Audit log',
        to: '/access/audit',
        icon: ScrollText,
        anyOf: [PERMISSIONS.AUDIT_READ],
      },
    ],
  },
];

/** Flat list of every navigable item, for breadcrumb and title lookup. */
export const ALL_ITEMS = SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.label, sectionId: s.id }))
);

/**
 * The sections this user should see, with unreachable items removed and empty
 * sections dropped.
 *
 * @param {(permissions: string[]) => boolean} canAny
 */
export function visibleSections(canAny) {
  return SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.anyOf || canAny(item.anyOf)),
  })).filter((section) => section.items.length > 0);
}

/** Longest matching nav item for a pathname, for the document title and crumb. */
export function itemForPath(pathname) {
  return ALL_ITEMS.filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))).sort(
    (a, b) => b.to.length - a.to.length
  )[0];
}
