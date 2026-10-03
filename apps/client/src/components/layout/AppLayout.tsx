import {
  Clapperboard,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth, useCurrentUser } from '../../auth/context';
import { cn } from '../../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/rentals', label: 'Rentals', icon: ReceiptText },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/customers', label: 'Customers', icon: UsersRound },
  { to: '/genres', label: 'Genres', icon: Tags },
  { to: '/users', label: 'Staff', icon: ShieldCheck, adminOnly: true },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 px-2 text-base font-semibold tracking-tight text-white"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-brand-500 shadow-sm">
        <Clapperboard className="size-4.5" aria-hidden />
      </span>
      Vidly
    </Link>
  );
}

function Sidebar() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user.isAdmin);

  return (
    <div className="flex h-full flex-col gap-6 bg-zinc-900 px-3 py-5">
      <Brand />
      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-0.5">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 pt-4">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5',
              isActive && 'bg-white/10',
            )
          }
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
            {initials(user.name) || <UserRound className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
              {user.name}
              {user.isAdmin && (
                <span className="rounded bg-brand-500 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white uppercase">
                  Admin
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-zinc-400">{user.email}</span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4.5" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="absolute inset-0 bg-zinc-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <Sidebar />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-3 rounded-md p-1 text-zinc-400 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold tracking-tight">Vidly</span>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
