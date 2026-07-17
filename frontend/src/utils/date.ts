export default function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString("en-GB", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        });
}

export function formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleString("en-GB", {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatCurrentDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
