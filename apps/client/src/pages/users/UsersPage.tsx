import type { User } from '@vidly/shared';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDeleteUser, useUpdateUser, useUsers } from '../../api/users';
import { useCurrentUser } from '../../auth/context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { SkeletonRows, Table, TBody, Td, Th, THead } from '../../components/ui/Table';
import { useUrlState } from '../../hooks/useUrlState';
import { errorMessage } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';

export default function UsersPage() {
  const me = useCurrentUser();
  const url = useUrlState();
  const search = url.getString('q');
  const page = url.getPage();
  const users = useUsers({ search: search || undefined, page, pageSize: 10 });
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [roleChange, setRoleChange] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  return (
    <>
      <PageHeader
        title="Staff"
        description="Who can sign in to the portal. Administrators can delete records and manage staff."
      />

      <Card>
        <div className="border-b border-zinc-100 p-4">
          <SearchInput
            label="Search staff"
            placeholder="Name or email…"
            value={search}
            onChange={(q) => url.update({ q })}
            className="sm:max-w-xs"
          />
        </div>

        {users.error ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : users.data?.total === 0 ? (
          <EmptyState icon={ShieldCheck} title="No staff match your search" />
        ) : (
          <>
            <Table className={cn(users.isPlaceholderData && 'opacity-60')}>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th className="hidden sm:table-cell">Joined</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {users.isPending ? (
                  <SkeletonRows columns={4} />
                ) : (
                  users.data?.items.map((user) => {
                    const isMe = user._id === me._id;
                    return (
                      <tr key={user._id} className="hover:bg-zinc-50/60">
                        <Td>
                          <div className="flex items-center gap-2 font-medium text-zinc-900">
                            {user.name}
                            {isMe && <Badge>You</Badge>}
                          </div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </Td>
                        <Td>
                          {user.isAdmin ? (
                            <Badge tone="brand">Administrator</Badge>
                          ) : (
                            <Badge>Clerk</Badge>
                          )}
                        </Td>
                        <Td className="hidden sm:table-cell">{formatDate(user.createdAt)}</Td>
                        <Td>
                          {!isMe && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setRoleChange(user)}
                              >
                                {user.isAdmin ? 'Remove admin' : 'Make admin'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${user.name}`}
                                className="hover:bg-red-50 hover:text-red-600"
                                onClick={() => setDeleting(user)}
                              >
                                <Trash2 aria-hidden />
                              </Button>
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </TBody>
            </Table>
            {users.data && (
              <Pagination {...users.data} onPageChange={(next) => url.update({ page: next })} />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={roleChange !== null}
        tone="primary"
        title={roleChange?.isAdmin ? 'Remove administrator access?' : 'Grant administrator access?'}
        description={
          roleChange?.isAdmin
            ? `${roleChange.name} will no longer be able to delete records or manage staff.`
            : `${roleChange?.name} will be able to delete records and manage staff accounts.`
        }
        confirmLabel={roleChange?.isAdmin ? 'Remove admin' : 'Make admin'}
        loading={updateUser.isPending}
        onClose={() => setRoleChange(null)}
        onConfirm={() =>
          roleChange &&
          updateUser.mutate(
            { id: roleChange._id, isAdmin: !roleChange.isAdmin },
            {
              onSuccess: (user) =>
                toast.success(
                  `${user.name} is now ${user.isAdmin ? 'an administrator' : 'a clerk'}`,
                ),
              onError: (error) => toast.error(errorMessage(error)),
              onSettled: () => setRoleChange(null),
            },
          )
        }
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete staff account?"
        description={`${deleting?.name} will be signed out and can no longer access the portal.`}
        confirmLabel="Delete account"
        loading={deleteUser.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          deleteUser.mutate(deleting._id, {
            onSuccess: () => toast.success(`Deleted ${deleting.name}`),
            onError: (error) => toast.error(errorMessage(error)),
            onSettled: () => setDeleting(null),
          })
        }
      />
    </>
  );
}
