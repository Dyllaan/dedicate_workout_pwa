export default function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        });
}

export function formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
