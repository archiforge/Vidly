import type { Customer, Movie } from '@vidly/shared';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useCustomer, useCustomers } from '../../api/customers';
import { useMovie, useMovies } from '../../api/movies';
import { useCreateRental } from '../../api/rentals';
import { EntityPicker } from '../../components/EntityPicker';
import { GoldBadge } from '../../components/GoldBadge';
import { StockBadge } from '../../components/StockBadge';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { errorMessage } from '../../lib/api-client';
import { formatCurrency } from '../../lib/format';

function CustomerSummary({ customer }: { customer: Customer }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 truncate text-sm font-medium text-zinc-900">
        {customer.name}
        {customer.isGold && <GoldBadge />}
      </p>
      <p className="truncate text-xs text-zinc-500">
        {customer.phone}
        {customer.email && ` · ${customer.email}`}
      </p>
    </div>
  );
}

function MovieSummary({ movie }: { movie: Movie }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{movie.title}</p>
        <p className="text-xs text-zinc-500">
          {movie.genre.name} · {formatCurrency(movie.dailyRentalRate)}/day
        </p>
      </div>
      <StockBadge stock={movie.numberInStock} />
    </div>
  );
}

/**
 * Selection seeded from the URL (?customerId=…) until the user picks something else.
 * `undefined` means "still using the URL's choice".
 */
function useSelection<T>(preselected: T | undefined) {
  const [choice, setChoice] = useState<T | null | undefined>(undefined);
  return [choice === undefined ? (preselected ?? null) : choice, setChoice] as const;
}

export default function NewRentalPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const createRental = useCreateRental();

  const preselectedCustomer = useCustomer(params.get('customerId') ?? undefined);
  const preselectedMovie = useMovie(params.get('movieId') ?? undefined);
  const [customer, setCustomer] = useSelection(preselectedCustomer.data);
  const [movie, setMovie] = useSelection(preselectedMovie.data);

  const [customerQuery, setCustomerQuery] = useState('');
  const [movieQuery, setMovieQuery] = useState('');
  const customerSearch = useDebouncedValue(customerQuery.trim());
  const movieSearch = useDebouncedValue(movieQuery.trim());

  const customers = useCustomers(
    { search: customerSearch || undefined, pageSize: 6 },
    { enabled: !customer },
  );
  const movies = useMovies(
    { search: movieSearch || undefined, inStock: true, pageSize: 6 },
    { enabled: !movie },
  );

  const canSubmit = customer && movie && movie.numberInStock > 0;

  const submit = () => {
    if (!customer || !movie) return;
    createRental.mutate(
      { customerId: customer._id, movieId: movie._id },
      {
        onSuccess: (rental) => {
          toast.success(`“${rental.movie.title}” checked out to ${rental.customer.name}`);
          navigate('/rentals');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <>
      <PageHeader title="New rental" description="Pick a customer and an available movie." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-6 p-5 sm:p-6">
            <EntityPicker
              label="Customer"
              placeholder="Search by name, phone or email…"
              query={customerQuery}
              onQueryChange={setCustomerQuery}
              results={customers.data?.items}
              loading={customers.isFetching}
              selected={customer}
              onSelect={setCustomer}
              getKey={(c) => c._id}
              renderOption={(c) => <CustomerSummary customer={c} />}
              renderSelected={(c) => <CustomerSummary customer={c} />}
              emptyMessage="No customers found."
              autoFocus={!customer}
            />
            <EntityPicker
              label="Movie"
              placeholder="Search available movies…"
              query={movieQuery}
              onQueryChange={setMovieQuery}
              results={movies.data?.items}
              loading={movies.isFetching}
              selected={movie}
              onSelect={setMovie}
              getKey={(m) => m._id}
              renderOption={(m) => <MovieSummary movie={m} />}
              renderSelected={(m) => <MovieSummary movie={m} />}
              emptyMessage="No movies in stock match your search."
            />
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Summary" />
          <div className="space-y-4 p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Customer</dt>
                <dd className="truncate text-right font-medium">{customer?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Movie</dt>
                <dd className="truncate text-right font-medium">{movie?.title ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Daily rate</dt>
                <dd className="font-medium tabular-nums">
                  {movie ? formatCurrency(movie.dailyRentalRate) : '—'}
                </dd>
              </div>
            </dl>
            <p className="flex gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
              <Info className="size-4 shrink-0 text-zinc-400" aria-hidden />
              The fee is charged on return: the daily rate for every started day, with a one-day
              minimum.
            </p>
            {movie && movie.numberInStock === 0 && (
              <p role="alert" className="text-sm text-red-600">
                This movie is out of stock. Choose another title.
              </p>
            )}
            <div className="flex gap-2">
              <LinkButton variant="secondary" to="/rentals" className="flex-1">
                Cancel
              </LinkButton>
              <Button
                className="flex-1"
                disabled={!canSubmit}
                loading={createRental.isPending}
                onClick={submit}
              >
                Check out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
