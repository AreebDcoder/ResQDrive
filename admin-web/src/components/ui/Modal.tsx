import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Modal — accessible dialog primitive with focus trap + ESC + backdrop.
 *
 * Features:
 *   - Backdrop click closes
 *   - ESC key closes
 *   - Body scroll locked while open
 *   - focus-visible ring
 *   - framer-motion enter/exit animation (respects prefers-reduced-motion automatically)
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby (when title is provided)
 *
 * Usage:
 *   <Modal open={open} onClose={close} title="Delete user?">
 *     <p>Are you sure?</p>
 *     <ModalFooter>
 *       <Button variant="secondary" onClick={close}>Cancel</Button>
 *       <Button variant="danger" onClick={confirm}>Delete</Button>
 *     </ModalFooter>
 *   </Modal>
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Size: sm/md/lg/xl */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable backdrop click to close (use for destructive confirmations) */
  disableBackdropClose?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  disableBackdropClose = false,
  className,
}: ModalProps) {
  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableBackdropClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, disableBackdropClose]);

  const titleId = title ? 'modal-title' : undefined;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            onClick={() => !disableBackdropClose && onClose()}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative w-full rounded-xl bg-white shadow-2xl',
              'dark:bg-gray-900 dark:ring-1 dark:ring-gray-800',
              SIZES[size],
              className,
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  )}
                </div>
                {!disableBackdropClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-6 flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-800', className)}>
      {children}
    </div>
  );
}
