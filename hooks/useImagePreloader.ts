import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';

interface PreloadOptions {
    priority?: 'low' | 'normal' | 'high';
    cachePolicy?: 'memory' | 'disk' | 'memory-disk';
}

export default function useImagePreloader() {
    const preloadedUris = useRef<Set<string>>(new Set());
    const preloadQueue = useRef<string[]>([]);
    const isPreloading = useRef(false);

    const preloadImage = async (uri: string, options: PreloadOptions = {}) => {
        if (preloadedUris.current.has(uri)) {
            return;
        }

        try {
            await Image.prefetch(uri, {
                cachePolicy: options.cachePolicy || 'memory-disk',
            });
            preloadedUris.current.add(uri);
        } catch (error) {
            if (__DEV__) {
                console.warn('Failed to preload image:', uri);
            }
        }
    };

    const preloadBatch = async (uris: string[], options: PreloadOptions = {}) => {
        const batchSize = 5;
        for (let i = 0; i < uris.length; i += batchSize) {
            const batch = uris.slice(i, i + batchSize);
            await Promise.all(batch.map(uri => preloadImage(uri, options)));
        }
    };

    const addToQueue = (uris: string[]) => {
        const newUris = uris.filter(uri => !preloadedUris.current.has(uri));
        preloadQueue.current.push(...newUris);
        processQueue();
    };

    const processQueue = async () => {
        if (isPreloading.current || preloadQueue.current.length === 0) {
            return;
        }

        isPreloading.current = true;
        const uri = preloadQueue.current.shift();
        
        if (uri) {
            await preloadImage(uri);
        }

        isPreloading.current = false;
        
        if (preloadQueue.current.length > 0) {
            setTimeout(processQueue, 100);
        }
    };

    const clearCache = () => {
        preloadedUris.current.clear();
        preloadQueue.current = [];
    };

    useEffect(() => {
        return () => {
            clearCache();
        };
    }, []);

    return {
        preloadImage,
        preloadBatch,
        addToQueue,
        clearCache,
        isPreloaded: (uri: string) => preloadedUris.current.has(uri),
    };
}
