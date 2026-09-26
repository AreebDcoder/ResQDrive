import { useState } from 'react';
import { CheckCircle2, XCircle, Wrench, MapPin, Briefcase } from 'lucide-react';
import { useWorkshopQueue, useVerifyWorkshop, useRejectWorkshop } from '../hooks/useUsers';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

/**
 * WorkshopQueuePage — pending mechanic workshop verifications.
 *
 * Each card shows: mechanic name + contact + workshop name + specialization
 * + address. Admin can approve (immediate) or reject (opens reason modal —
 * reason is included in the rejection email sent to the mechanic).
 */

export default function WorkshopQueuePage() {
  const { data: queue, isLoading, isError, error, refetch } = useWorkshopQueue();
  const verifyMut = useVerifyWorkshop();
  const rejectMut = useRejectWorkshop();

  const [rejectingUser, setRejectingUser] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (userId: string) => {
    verifyMut.mutate({ id: userId, isWorkshopVerified: true });
  };

  const openRejectModal = (user: { id: string; name: string }) => {
    setRejectingUser(user);
    setRejectReason('');
  };

  const handleRejectConfirm = () => {
    if (!rejectingUser) return;
    if (rejectReason.trim().length < 5) {
      import('sonner').then(({ toast }) => toast.error('Please provide a more detailed rejection reason.'));
      return;
    }
    rejectMut.mutate(
      { id: rejectingUser.id, reason: rejectReason.trim() },
      { onSettled: () => setRejectingUser(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load workshop queue"
        description={error ? String(error) : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workshop verification queue</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {queue?.length ?? 0} pending approval{queue?.length === 1 ? '' : 's'}. Approved mechanics appear in driver search results.
          Rejected mechanics receive an email with the admin-provided reason and can re-apply.
        </p>
      </div>

      {/* Queue */}
      {queue?.length === 0 ? (
        <EmptyState
          icon={<Wrench size={40} />}
          title="All workshops verified"
          description="There are no pending workshop approvals at this time. New mechanic registrations will appear here for review."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {queue?.map((user: any) => {
            const md = user.mechanicDetails;
            return (
              <Card key={user.id} className="space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                    {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.phoneNumber}</p>
                  </div>
                  <Badge variant="warning" size="sm" dot>Pending</Badge>
                </div>

                {/* Workshop details */}
                <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
                  <DetailRow icon={<Briefcase size={14} />} label="Workshop" value={md?.workshopName || 'Not provided'} />
                  <DetailRow icon={<Wrench size={14} />} label="Specialization" value={md?.specialization || 'Not provided'} />
                  <DetailRow icon={<MapPin size={14} />} label="Address" value={md?.workshopAddress || 'Not provided'} />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openRejectModal({ id: user.id, name: user.fullName })}
                    leftIcon={<XCircle size={14} />}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    loading={verifyMut.isPending}
                    leftIcon={<CheckCircle2 size={14} />}
                  >
                    Approve
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={Boolean(rejectingUser)}
        onClose={() => setRejectingUser(null)}
        title="Reject workshop application"
        description={rejectingUser ? `Mechanic: ${rejectingUser.name}` : ''}
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The mechanic will receive an email explaining why their workshop was rejected.
            Please be specific and actionable so they can fix the issue and re-apply.
          </p>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            autoFocus
            placeholder="e.g. Workshop address not verifiable. Please upload a utility bill (electricity/gas) as proof of address and re-apply."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Min 5 characters. Max 1000.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setRejectingUser(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={handleRejectConfirm}
            loading={rejectMut.isPending}
            disabled={rejectReason.trim().length < 5}
            leftIcon={<XCircle size={14} />}
          >
            Send rejection email
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 break-words">{value}</p>
      </div>
    </div>
  );
}
