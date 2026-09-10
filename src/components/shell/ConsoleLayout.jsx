import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { itemForPath } from './nav';

/**
 * The authenticated frame: nav rail, top bar, scrolling content.
 *
 * The page scrolls inside `main` rather than on the document, which is what
 * lets the rail and the bar stay put without either being `position: fixed`
 * over content. tCketManage does the same, and it is the reason its sidebar
 * never scrolls away mid-table.
 *
 * The drawer closes on every navigation. Without that, tapping a link on a
 * phone leaves the drawer sitting over the page you just asked for.
 *
 * There is no mobile bottom bar. tCketManage has five destinations and they
 * fit one; this console has nine across four sections, and the honest
 * translation of a five-tab bar is not a bar with a "More" sheet on the end —
 * it is the drawer, one tap away, showing the whole contents page at once.
 *
 * The document title tracks the route so browser history and pinned tabs are
 * distinguishable — a console with eight identically-titled tabs is the sort of
 * thing people work around by keeping only one open.
 */
export default function ConsoleLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const crumb = itemForPath(location.pathname);

  useEffect(() => setNavOpen(false), [location.pathname]);

  useEffect(() => {
    document.title = crumb?.label ? `${crumb.label} · Minbar` : 'Minbar Console';
  }, [crumb]);

  return (
    <div className="h-screen flex overflow-hidden bg-ground">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar onOpenNav={() => setNavOpen(true)} crumb={crumb} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
