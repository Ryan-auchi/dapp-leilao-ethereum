import type { ReactNode } from "react";

interface Props {
  type?: "error" | "warning" | "success";
  children: ReactNode;
  onClose?: () => void;
}

export default function Alert({ type = "error", children, onClose }: Props) {
  return (
    <div className={`alert alert-${type}`}>
      <span>{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      )}
    </div>
  );
}
