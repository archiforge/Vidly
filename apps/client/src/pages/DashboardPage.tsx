import { LOW_STOCK_THRESHOLD, type DashboardStats } from '@vidly/shared';
import {
  ArrowRight,
  DollarSign,
  Film,
  PackageOpen,
  Plus,
  ReceiptText,
  TriangleAlert,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useStats } from '../api/stats';
import { useCurrentUser } from '../auth/context';
import { GoldBadge } from '../components/GoldBadge';
import { RentalStatusBadge } from '../components/RentalStatusBadge';
import { LinkButton } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { formatCurrency, formatNumber, formatRelativeDays, pluralize } from '../lib/format';

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </Card>
  );
}

function InventoryAlerts({ inventory }: { inventory: DashboardStats['inventory'] }) {
  const alerts = [
    inventory.outOfStock > 0 && {
      to: '/movies?availability=out',
      tone: 'text-red-700 bg-red-50 ring-red-600/10',
      text: `${pluralize(inventory.outOfStock, 'title')} out of stock`,
    },
    inventory.lowStock > 0 && {
      to: '/movies?availability=in&sort=numberInStock',
      tone: 'text-amber-800 bg-amber-50 ring-amber-600/15',
      text: `${pluralize(inventory.lowStock, 'title')} with ${LOW_STOCK_THRESHOLD} or fewer copies left`,
    },
  ].filter((alert) => alert !== false);

  if (alerts.length === 0) return null;
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      {alerts.map((alert) => (
        <Link
          key={alert.to}
          to={alert.to}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${alert.tone} hover:brightness-[0.98]`}
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{alert.text}</span>
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

function TopMovies({ movies }: { movies: DashboardStats['topMovies'] }) {
  const max = Math.max(1, ...movies.map((movie) => movie.rentals));
  return (
    <Card>
      <CardHeader title="Most rented" description="All-time rentals per title" />
      {movies.length === 0 ? (
        <EmptyState icon={Film} title="No rentals yet" />
      ) : (
        <ol className="space-y-4 p-5">
          {movies.map((movie, index) => (
            <li key={movie._id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-4 text-zinc-400 tabular-nums">{index + 1}</span>
                  <Link
                    to={`/movies/${movie._id}/edit`}
                    className="truncate font-medium hover:text-brand-700"
                  >
                    {movie.title}
                  </Link>
                </span>
                <span className="text-zinc-500 tabular-nums">{formatNumber(movie.rentals)}</span>
              </div>
              <div className="mt-1.5 ml-6 h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(movie.rentals / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function RecentRentals({ rentals }: { rentals: DashboardStats['recentRentals'] }) {
  return (
    <Card>
      <CardHeader
        title="Recent activity"
        description="Latest checkouts"
        actions={
          <Link
            to="/rentals?status=all"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        }
      />
      {rentals.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No rentals yet"
          description="Checkouts will show up here."
        />
      ) : (
        <ul className="divide-y divide-zinc-100">
          {rentals.map((rental) => (
            <li key={rental._id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{rental.movie.title}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-zinc-500">
                  <Link to={`/customers/${rental.customer._id}`} className="hover:text-brand-700">
                    {rental.customer.name}
                  </Link>
                  {rental.customer.isGold && <GoldBadge />}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <RentalStatusBadge rental={rental} />
                <span className="text-xs text-zinc-500">{formatRelativeDays(rental.dateOut)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const { data: stats, error, refetch, isPending } = useStats();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${firstName}. Here’s how the store is doing.`}
        actions={
          <>
            <LinkButton variant="secondary" to="/customers/new">
              <Plus aria-hidden />
              Add customer
            </LinkButton>
            <LinkButton to="/rentals/new">
              <ReceiptText aria-hidden />
              New rental
            </LinkButton>
          </>
        }
      />

      {isPending ? (
        <PageSpinner />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ReceiptText}
              label="Movies out"
              value={formatNumber(stats.rentals.active)}
              detail={`${pluralize(stats.rentals.last30Days, 'checkout')} in the last 30 days`}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue (30 days)"
              value={formatCurrency(stats.rentals.revenueLast30Days)}
              detail={`${formatCurrency(stats.rentals.revenue)} all time`}
            />
            <StatCard
              icon={UsersRound}
              label="Customers"
              value={formatNumber(stats.counts.customers)}
              detail={`${pluralize(stats.counts.goldCustomers, 'gold member')}`}
            />
            <StatCard
              icon={PackageOpen}
              label="Copies on the shelf"
              value={formatNumber(stats.inventory.totalCopies)}
              detail={`Across ${pluralize(stats.counts.movies, 'title')} in ${pluralize(stats.counts.genres, 'genre')}`}
            />
          </div>

          <InventoryAlerts inventory={stats.inventory} />

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecentRentals rentals={stats.recentRentals} />
            </div>
            <div className="lg:col-span-2">
              <TopMovies movies={stats.topMovies} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
