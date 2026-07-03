import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className="fixed bottom-6 right-6 z-50 transition-all duration-300"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
            }}
        >
            <div
                className="flex items-center gap-3 px-4 py-3 rounded-sm shadow-lg"
                style={{
                    background: type === 'success' ? '#0a2e1a' : '#2e0a0a',
                    border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderLeft: `3px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
                }}
            >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: type === 'success' ? '#22c55e' : '#ef4444' }}>
                    {message}
                </span>
                <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} style={{ color: '#555560', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
