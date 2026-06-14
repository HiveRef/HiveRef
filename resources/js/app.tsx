import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot, type Root } from 'react-dom/client';

createInertiaApp({
    resolve: (name: string) => {
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true }) as Record<string, { default: React.ComponentType }>;
        return pages[`./Pages/${name}.tsx`].default;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
});