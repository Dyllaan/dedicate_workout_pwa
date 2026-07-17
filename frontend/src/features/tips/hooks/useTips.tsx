import { useQuery } from '@tanstack/react-query';
import type Tip from "@/features/tips/types/Tip";

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function useTips() {
    return useQuery<Tip[]>({
        queryKey: ['workoutTips'],
        queryFn: async () => {
            const response = await fetch('/tips.json');
            // silently handle failed load
            if(!response.ok) return [];
            const data = await response.json();
            return shuffleArray(data);
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    });
}