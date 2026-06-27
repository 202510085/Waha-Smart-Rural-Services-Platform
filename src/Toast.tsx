import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface Props {
  toast: ToastData | null;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-[#1a5c38]',
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] msg-appear">
      <div className={`${colors[toast.type || 'success']} text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm`}>
        <CheckCircle2 size={20} className="flex-shrink-0" />
        <p className="text-sm font-semibold flex-1">{toast.message}</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/15">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
