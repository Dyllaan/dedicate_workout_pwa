import { useState, useEffect } from 'react';

export default function useLocalStorage<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved, dateReviver) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // localStorage can be unavailable in private mode or full.
        }
    }, [key, value]);

    function dateReviver(key: string, value: unknown): unknown {
        if (key === 'createdAt' && typeof value === 'string') {
            return new Date(value);
        }
        return value;
    }

    return [value, setValue] as const;
}
