import { zodResolver } from '@hookform/resolvers/zod';
import { genreInputSchema, type Genre } from '@vidly/shared';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useDeleteGenre, useGenres, useSaveGenre } from '../../api/genres';
import { useCurrentUser } from '../../auth/context';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/Form';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonRows, Table, TBody, Td, Th, THead } from '../../components/ui/Table';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { errorMessage } from '../../lib/api-client';
import { formatDate, pluralize } from '../../lib/format';
import { handleFormError } from '../../lib/form-errors';

function AddGenreForm() {
  const save = useSaveGenre();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(genreInputSchema), defaultValues: { name: '' } });

  return (
    <form
      noValidate
      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start"
      onSubmit={handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: (genre) => {
            toast.success(`Added “${genre.name}”`);
            reset();
          },
          onError: (error) => handleFormError(error, setError, ['name']),
        }),
      )}
    >
      <TextField
        label={<span className="sr-only">Genre name</span>}
        placeholder="e.g. Documentary"
        className="flex-1 sm:max-w-sm [&_label]:mb-0"
        error={errors.name?.message}
        {...register('name')}
      />
      <Button type="submit" loading={save.isPending}>
        <Plus aria-hidden />
        Add genre
      </Button>
    </form>
  );
}

function RenameGenreDialog({ genre, onClose }: { genre: Genre | null; onClose: () => void }) {
  const save = useSaveGenre();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(genreInputSchema),
    values: { name: genre?.name ?? '' },
  });

  return (
    <Dialog
      open={genre !== null}
      onClose={onClose}
      title="Rename genre"
      description="Movies in this genre are updated too."
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          save.mutate(
            { ...values, id: genre?._id },
            {
              onSuccess: (saved) => {
                toast.success(`Renamed to “${saved.name}”`);
                onClose();
              },
              onError: (error) => handleFormError(error, setError, ['name']),
            },
          ),
        )}
      >
        <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function GenresPage() {
  const user = useCurrentUser();
  const genres = useGenres();
  const deleteGenre = useDeleteGenre();
  const [renaming, setRenaming] = useState<Genre | null>(null);
  const [deleting, setDeleting] = useState<Genre | null>(null);

  return (
    <>
      <PageHeader
        title="Genres"
        description="Organise the catalogue. Renaming a genre updates its movies."
      />

      <Card className="max-w-3xl">
        <CardHeader title="Add a genre" />
        <AddGenreForm />
      </Card>

      <Card className="mt-6 max-w-3xl">
        {genres.error ? (
          <ErrorState error={genres.error} onRetry={() => void genres.refetch()} />
        ) : genres.data?.length === 0 ? (
          <EmptyState icon={Tags} title="No genres yet" description="Add your first genre above." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Movies</Th>
                <Th className="hidden sm:table-cell">Created</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {genres.isPending ? (
                <SkeletonRows columns={4} rows={4} />
              ) : (
                genres.data?.map((genre) => {
                  const inUse = (genre.movieCount ?? 0) > 0;
                  return (
                    <tr key={genre._id} className="hover:bg-zinc-50/60">
                      <Td className="font-medium text-zinc-900">{genre.name}</Td>
                      <Td>
                        {inUse ? (
                          <Link
                            to={`/movies?genre=${genre._id}`}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            {pluralize(genre.movieCount ?? 0, 'movie')}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </Td>
                      <Td className="hidden sm:table-cell">{formatDate(genre.createdAt)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Rename ${genre.name}`}
                            onClick={() => setRenaming(genre)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          {user.isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${genre.name}`}
                              title={inUse ? 'Genres with movies can’t be deleted' : undefined}
                              disabled={inUse}
                              className="hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleting(genre)}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        )}
      </Card>

      <RenameGenreDialog genre={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete genre?"
        description={
          <>
            The genre <strong className="font-medium text-zinc-900">{deleting?.name}</strong> will
            be deleted.
          </>
        }
        confirmLabel="Delete genre"
        loading={deleteGenre.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          deleteGenre.mutate(deleting._id, {
            onSuccess: () => toast.success(`Deleted “${deleting.name}”`),
            onError: (error) => toast.error(errorMessage(error)),
            onSettled: () => setDeleting(null),
          })
        }
      />
    </>
  );
}
