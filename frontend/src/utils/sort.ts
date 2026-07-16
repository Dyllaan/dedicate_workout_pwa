export const sortByCreatedAtDesc = <T extends { createdAt?: Date | string }>(a: T, b: T): number => {
    if (!a.createdAt || !b.createdAt) return 0;
    
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return dateB.getTime() - dateA.getTime();
}
/**
 * TODO: USE THIS FOR SORTING WORKOUT ENTRIES IN FUTURE
 * DONT DELETE
 * @param a 
 * @param b 
 * @returns 
 */
export const sortByCreatedAtAsc = <T extends { createdAt?: Date | string }>(a: T, b: T): number => {
    if (!a.createdAt || !b.createdAt) return 0;
    
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return dateA.getTime() - dateB.getTime();
}