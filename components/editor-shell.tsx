import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function EditorShell({ title, description, onClose, busy, className = "", children }: {
  title: string; description: string; onClose: () => void; busy: boolean; className?: string; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content ref={panel} className={`dialog-panel ${className}`}
          onOpenAutoFocus={event => {
            if (document.activeElement instanceof HTMLElement) previousFocus.current = document.activeElement;
            const firstField = panel.current?.querySelector<HTMLElement>('input:not([hidden]), .dialog-actions button');
            if (firstField) {
              event.preventDefault();
              firstField.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={event => {
            if (previousFocus.current?.isConnected) {
              event.preventDefault();
              previousFocus.current.focus({ preventScroll: true });
            }
          }}>
          <Dialog.Close className="icon-button dialog-close" aria-label="Close dialog" disabled={busy}><X size={19} /></Dialog.Close>
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-description">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

