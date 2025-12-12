import { Image } from 'expo-image';

const preloadQueue: string[] = [];
let isPreloading = false;

export async function preloadImages(uris: string[], priority: 'high' | 'low' = 'low'): Promise<void> {
    if (priority === 'high') {
        await Promise.all(uris.map(uri => Image.prefetch(uri)));
    } else {
        preloadQueue.push(...uris);
        processQueue();
    }
}

async function processQueue(): Promise<void> {
    if (isPreloading || preloadQueue.length === 0) return;

    isPreloading = true;

    while (preloadQueue.length > 0) {
        const batch = preloadQueue.splice(0, 3);
        await Promise.all(batch.map(uri =>
            Image.prefetch(uri).catch(() => { })
        ));
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    isPreloading = false;
}

export function preloadAdjacentImages(
    photos: { uri: string }[],
    currentIndex: number,
    range: number = 2
): void {
    const uris: string[] = [];

    for (let i = 1; i <= range; i++) {
        const nextIndex = currentIndex + i;
        const prevIndex = currentIndex - i;

        if (nextIndex < photos.length) {
            uris.push(photos[nextIndex].uri);
        }
        if (prevIndex >= 0) {
            uris.push(photos[prevIndex].uri);
        }
    }

    preloadImages(uris, 'high');
}

export function clearPreloadQueue(): void {
    preloadQueue.length = 0;
}
