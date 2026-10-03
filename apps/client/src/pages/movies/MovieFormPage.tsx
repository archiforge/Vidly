import { zodResolver } from '@hookform/resolvers/zod';
import { MOVIE_LIMITS, movieInputSchema, type Genre, type Movie } from '@vidly/shared';
import { Tags } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGenres } from '../../api/genres';
import { useMovie, useSaveMovie } from '../../api/movies';
import { Button, LinkButton } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/Form';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ApiError } from '../../lib/api-client';
import { handleFormError } from '../../lib/form-errors';
import { NotFoundPage } from '../ErrorPages';

function MovieForm({ movie, genres }: { movie?: Movie; genres: Genre[] }) {
  const navigate = useNavigate();
  const save = useSaveMovie();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(movieInputSchema),
    defaultValues: {
      title: movie?.title ?? '',
      genreId: movie?.genre._id ?? '',
      numberInStock: movie?.numberInStock ?? 1,
      dailyRentalRate: movie?.dailyRentalRate ?? 2.99,
    },
  });

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { ...values, id: movie?._id },
      {
        onSuccess: (saved) => {
          toast.success(
            movie ? `Saved changes to “${saved.title}”` : `Added “${saved.title}” to the catalogue`,
          );
          navigate('/movies');
        },
        onError: (error) =>
          handleFormError(error, setError, [
            'title',
            'genreId',
            'numberInStock',
            'dailyRentalRate',
          ]),
      },
    ),
  );

  return (
    <Card className="max-w-2xl">
      <form noValidate onSubmit={onSubmit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <TextField
            label="Title"
            className="sm:col-span-2"
            autoFocus={!movie}
            error={errors.title?.message}
            {...register('title')}
          />
          <SelectField
            label="Genre"
            className="sm:col-span-2"
            error={errors.genreId?.message}
            hint={
              <Link to="/genres" className="text-brand-600 hover:text-brand-700">
                Manage genres
              </Link>
            }
            {...register('genreId')}
          >
            <option value="">Select a genre…</option>
            {genres.map((genre) => (
              <option key={genre._id} value={genre._id}>
                {genre.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Copies in stock"
            type="number"
            inputMode="numeric"
            min={0}
            max={MOVIE_LIMITS.maxStock}
            step={1}
            hint="Copies currently available to rent."
            error={errors.numberInStock?.message}
            {...register('numberInStock', { valueAsNumber: true })}
          />
          <TextField
            label="Daily rental rate (USD)"
            type="number"
            inputMode="decimal"
            min={0}
            max={MOVIE_LIMITS.maxDailyRate}
            step={0.01}
            error={errors.dailyRentalRate?.message}
            {...register('dailyRentalRate', { valueAsNumber: true })}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4 sm:px-6">
          <LinkButton variant="secondary" to="/movies">
            Cancel
          </LinkButton>
          <Button type="submit" loading={save.isPending} disabled={Boolean(movie) && !isDirty}>
            {movie ? 'Save changes' : 'Add movie'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function MovieFormPage() {
  const { id } = useParams();
  const genres = useGenres();
  const movie = useMovie(id);

  if (movie.error instanceof ApiError && movie.error.status === 404) return <NotFoundPage />;

  const title = id ? 'Edit movie' : 'New movie';
  let content;
  if (genres.isPending || (id && movie.isPending)) {
    content = <PageSpinner />;
  } else if (genres.error || movie.error) {
    content = (
      <Card>
        <ErrorState
          error={genres.error ?? movie.error}
          onRetry={() => void Promise.all([genres.refetch(), movie.refetch()])}
        />
      </Card>
    );
  } else if (genres.data?.length === 0) {
    content = (
      <Card className="max-w-2xl">
        <EmptyState
          icon={Tags}
          title="Create a genre first"
          description="Every movie belongs to a genre. Add at least one before adding movies."
          action={<LinkButton to="/genres">Manage genres</LinkButton>}
        />
      </Card>
    );
  } else {
    content = <MovieForm key={id ?? 'new'} movie={movie.data} genres={genres.data ?? []} />;
  }

  return (
    <>
      <PageHeader
        title={title}
        description={movie.data?.title ?? 'Add a title to the catalogue.'}
      />
      {content}
    </>
  );
}
