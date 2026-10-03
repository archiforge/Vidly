import type { Movie } from '@vidly/shared';
import { Film, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useGenres } from '../../api/genres';
import { useDeleteMovie, useMovies } from '../../api/movies';
import { useCurrentUser } from '../../auth/context';
import { StockBadge } from '../../components/StockBadge';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { controlClasses } from '../../components/ui/styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { SkeletonRows, SortableTh, Table, TBody, Td, Th, THead } from '../../components/ui/Table';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useUrlState } from '../../hooks/useUrlState';
import { errorMessage } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { formatCurrency } from '../../lib/format';

const SORTS = ['title', 'genre', 'numberInStock', 'dailyRentalRate'] as const;
const AVAILABILITY = ['all', 'in', 'out'] as const;

export default function MoviesPage() {
  const user = useCurrentUser();
  const url = useUrlState();
  const search = url.getString('q');
  const genreId = url.getString('genre');
  const availability = url.getOneOf('availability', AVAILABILITY, 'all');
  const sort = url.getOneOf('sort', SORTS, 'title');
  const order = url.getOneOf('order', ['asc', 'desc'] as const, 'asc');
  const page = url.getPage();

  const genres = useGenres();
  const movies = useMovies({
    page,
    pageSize: 10,
    search: search || undefined,
    genreId: genreId || undefined,
    inStock: availability === 'all' ? undefined : availability === 'in',
    sort,
    order,
  });
  const deleteMovie = useDeleteMovie();
  const [pendingDelete, setPendingDelete] = useState<Movie | null>(null);

  const filtered = Boolean(search || genreId || availability !== 'all');
  const onSort = (field: (typeof SORTS)[number], nextOrder: 'asc' | 'desc') =>
    url.update({ sort: field, order: nextOrder });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMovie.mutate(pendingDelete._id, {
      onSuccess: () => {
        toast.success(`Deleted “${pendingDelete.title}”`);
        setPendingDelete(null);
      },
      onError: (error) => {
        toast.error(errorMessage(error));
        setPendingDelete(null);
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Movies"
        description="Your catalogue and how many copies are on the shelf."
        actions={
          <LinkButton to="/movies/new">
            <Plus aria-hidden />
            New movie
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row">
          <SearchInput
            label="Search movies"
            placeholder="Search by title…"
            value={search}
            onChange={(q) => url.update({ q })}
            className="sm:max-w-xs sm:flex-1"
          />
          <select
            aria-label="Filter by genre"
            value={genreId}
            onChange={(event) => url.update({ genre: event.target.value })}
            className={cn(controlClasses(), 'sm:w-48')}
          >
            <option value="">All genres</option>
            {genres.data?.map((genre) => (
              <option key={genre._id} value={genre._id}>
                {genre.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by availability"
            value={availability}
            onChange={(event) =>
              url.update({ availability: event.target.value === 'all' ? '' : event.target.value })
            }
            className={cn(controlClasses(), 'sm:w-44')}
          >
            <option value="all">Any availability</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>

        {movies.error ? (
          <ErrorState error={movies.error} onRetry={() => void movies.refetch()} />
        ) : movies.data?.total === 0 ? (
          filtered ? (
            <EmptyState
              icon={Film}
              title="No movies match your filters"
              action={
                <Button
                  variant="secondary"
                  onClick={() => url.update({ q: '', genre: '', availability: '' })}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Film}
              title="No movies yet"
              description="Add your first title to start renting it out."
              action={<LinkButton to="/movies/new">Add a movie</LinkButton>}
            />
          )
        ) : (
          <>
            <Table className={cn(movies.isPlaceholderData && 'opacity-60 transition-opacity')}>
              <THead>
                <tr>
                  <SortableTh
                    field="title"
                    label="Title"
                    sort={sort}
                    order={order}
                    onSort={onSort}
                  />
                  <SortableTh
                    field="genre"
                    label="Genre"
                    sort={sort}
                    order={order}
                    onSort={onSort}
                  />
                  <SortableTh
                    field="numberInStock"
                    label="Stock"
                    sort={sort}
                    order={order}
                    onSort={onSort}
                  />
                  <SortableTh
                    field="dailyRentalRate"
                    label="Daily rate"
                    sort={sort}
                    order={order}
                    onSort={onSort}
                    className="text-right"
                  />
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {movies.isPending ? (
                  <SkeletonRows columns={5} />
                ) : (
                  movies.data?.items.map((movie) => (
                    <tr key={movie._id} className="hover:bg-zinc-50/60">
                      <Td className="font-medium text-zinc-900">
                        <Link to={`/movies/${movie._id}/edit`} className="hover:text-brand-700">
                          {movie.title}
                        </Link>
                      </Td>
                      <Td>{movie.genre.name}</Td>
                      <Td>
                        <StockBadge stock={movie.numberInStock} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatCurrency(movie.dailyRentalRate)}
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          {movie.numberInStock > 0 && (
                            <LinkButton
                              variant="ghost"
                              size="sm"
                              to={`/rentals/new?movieId=${movie._id}`}
                              aria-label={`Rent out ${movie.title}`}
                            >
                              <ReceiptText aria-hidden />
                              Rent
                            </LinkButton>
                          )}
                          <LinkButton
                            variant="ghost"
                            size="icon"
                            to={`/movies/${movie._id}/edit`}
                            aria-label={`Edit ${movie.title}`}
                          >
                            <Pencil aria-hidden />
                          </LinkButton>
                          {user.isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${movie.title}`}
                              className="hover:bg-red-50 hover:text-red-600"
                              onClick={() => setPendingDelete(movie)}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
            {movies.data && (
              <Pagination {...movies.data} onPageChange={(next) => url.update({ page: next })} />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete movie?"
        description={
          <>
            <strong className="font-medium text-zinc-900">{pendingDelete?.title}</strong> will be
            removed from the catalogue. Past rental records are kept.
          </>
        }
        confirmLabel="Delete movie"
        loading={deleteMovie.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
