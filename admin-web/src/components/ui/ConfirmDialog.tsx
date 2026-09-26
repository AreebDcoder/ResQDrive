import { AlertTriangle } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

/**
 * ConfirmDialog — replacement for window.confirm().
 *
 * Use for any "are you sure?" flow — destructive especially.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={close}
 *     onConfirm={confirm}
 *     title="Delete this user?"
 *     description="This permanently deletes the user and all related records. This cannot be undone."
 *     confirmLabel="Yes, delete"
 *     variant="danger"
 *   />
 *
 * For very destructive actions, set requireConfirmText to force user to type
 * the resource name to confirm.
 */

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  /** Disable backdrop click + ESC (force user to choose a button) */
  requireExplicitChoice?: boolean;
}

const VARIANT_ICON_COLOR: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  danger: 'text-danger-500',
  warning: 'text-warning-500',
  primary: 'text-primary-500',
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  requireExplicitChoice = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      disableBackdropClose={requireExplicitChoice || loading}
    >
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 shrink-0 ${VARIANT_ICON_COLOR[variant]}`} aria-hidden>
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'primary' ? 'primary' : variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
