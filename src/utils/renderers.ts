import { useStatus } from '../composables/useStatus';

/**
 * Renderer for status badges based on Dynamic Global Status Store.
 */
export const statusRenderer = (_instance: any, td: HTMLElement, _row: number, _col: number, _prop: string, value: any) => {
    td.innerHTML = '';

    const { getStatus } = useStatus();

    if (value) {
        const statusInfo = getStatus(value);
        const label = statusInfo?.name || '...';
        const color = statusInfo?.color_code || '#6C757D';

        // Container (Badge)
        const badge = document.createElement('div');

        // Text
        const text = document.createElement('span');
        text.innerText = label;

        // Badge styling (Ultra-Minimalist: text only)
        badge.style.color = color;

        // Classes for an ultra-minimalist look
        badge.className = `inline-flex items-center px-1 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors duration-300`;

        badge.appendChild(text);

        td.appendChild(badge);
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';
    }
    return td;
};

/**
 * Helper to create action buttons in a row.
 */
export const createActionButtons = (container: HTMLElement, actions: { title: string; icon: string; class: string; onClick: () => void }[]) => {
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `p-1.5 rounded-md transition-all hover:scale-110 active:scale-95 ${action.class}`;
        btn.title = action.title;
        btn.innerHTML = action.icon;
        btn.onclick = (e) => {
            e.stopPropagation();
            action.onClick();
        };
        container.appendChild(btn);
    });
};
