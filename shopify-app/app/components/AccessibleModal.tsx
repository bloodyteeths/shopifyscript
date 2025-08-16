import { Modal, Button } from '@shopify/polaris';
import { useEffect, useRef } from 'react';

interface AccessibleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    content: string;
    onAction: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    content: string;
    onAction: () => void;
    disabled?: boolean;
  }>;
  testId?: string;
}

export default function AccessibleModal({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryActions,
  testId
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (open && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-content"
        data-testid={testId}
      >
        <Modal.Section id="modal-content">
          {children}
        </Modal.Section>
      </div>
    </Modal>
  );
}