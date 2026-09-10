import { NavLink, useNavigate } from 'react-router-dom';
import { ExternalLink, X, LogOut, User, KeyRound } from 'lucide-react';
import MinbarMark from '../brand/MinbarMark';
import Menu, { MenuItem, MenuDivider } from '../ui/Menu';
import { useAuth } from '../../context/AuthContext';
import { EXTERNAL_LINKS, visibleSections } from './nav';

/**
 * Primary navigation.
 *
 * Icons are back. The dark theme dropped them on the argument that nine
 * plain-English destinations do not need pictograms and that an icon beside
 * every one is the most recognisable feature of a generated admin panel — a
 * fair point when the column was a contents page ruled onto a dark sheet. It
 * stops holding once the column is a white rail with tinted active rows,
 * because then the row needs something to anchor its left edge or the label
 * floats in the padding. `nav.js` has carried an `icon` on every item all
 * along; this is the first thing to render it.
 *
 * The active item is a tinted lozenge rather than the rotated ember square
 * from the brand lockup. On white the square read as a bullet point.
 *
 * Sections whose every item is out of reach are dropped rather than greyed —
 * see `visibleSections`.
 */
const ROW =
  'flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium ' +
  'transition-colors duration-150';

export default function Sidebar({ open, onClose }) {
  const { user, canAny, logout } = useAuth();
  const navigate = useNavigate();
  const sections = visibleSections(canAny);
  const externals = EXTERNAL_LINKS.filter((l) => !l.anyOf || canAny(l.anyOf));

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Signed in';

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-abyss/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-[var(--nav-w)] shrink-0 flex flex-col',
          'bg-surface border-r border-hair',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between h-[var(--bar-h)] px-4 shrink-0 border-b border-hair">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <MinbarMark size={24} />
            <span className="wm text-ink text-[13px]">MINBAR</span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden text-faint hover:text-ink transition-colors"
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {sections.map((section) => (
            <div key={section.id} className="mb-4 last:mb-0">
              {section.label && <div className="cap px-2.5 mb-1.5 mt-1">{section.label}</div>}
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          [
                            ROW,
                            isActive
                              ? 'bg-ember-dim text-ember'
                              : 'text-muted hover:bg-raised hover:text-ink',
                          ].join(' ')
                        }
                      >
                        {Icon && <Icon size={15} strokeWidth={2} className="shrink-0" />}
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {externals.length > 0 && (
            <div>
              <div className="cap px-2.5 mb-1.5 mt-1">Elsewhere</div>
              <ul>
                {externals.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${ROW} text-muted hover:bg-raised hover:text-ink`}
                      >
                        {Icon && <Icon size={15} strokeWidth={2} className="shrink-0" />}
                        <span className="flex-1">{link.label}</span>
                        <ExternalLink size={11} className="text-faint shrink-0" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/*
          Identity sits at the foot of the rail, where tCketManage keeps it, so
          the two consoles put "who am I signed in as" in the same corner. The
          name opens the account menu; sign-out is its own target beside it,
          because burying the one control people reach for in a hurry behind a
          menu is how you get someone closing the tab instead.
        */}
        <div className="shrink-0 border-t border-hair p-2.5">
          <div className="flex items-center gap-2">
            <Menu
              align="left"
              trigger={
                <button className="flex flex-1 min-w-0 items-center gap-2.5 px-2 py-[7px] rounded-md hover:bg-raised transition-colors text-left">
                  <span className="size-7 shrink-0 rounded-full bg-raised grid place-items-center">
                    <User size={14} className="text-muted" strokeWidth={2} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink truncate">
                      {name}
                    </span>
                    <span className="val block text-[10.5px] text-faint truncate">
                      {user?.email}
                    </span>
                  </span>
                </button>
              }
            >
              <MenuItem icon={User} onClick={() => navigate('/account')}>
                Account
              </MenuItem>
              <MenuItem icon={KeyRound} onClick={() => navigate('/account#password')}>
                Change password
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={LogOut} danger onClick={signOut}>
                Sign out
              </MenuItem>
            </Menu>

            <button
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="size-7 shrink-0 grid place-items-center rounded-md text-faint
                         hover:bg-bad-dim hover:text-bad transition-colors"
            >
              <LogOut size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
