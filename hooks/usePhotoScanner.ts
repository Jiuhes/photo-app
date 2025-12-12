import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';

interface ScanProgress {
    current: number;
    total: number;
    percentage: number;
}

export function usePhotoScanner() {
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress>({ current: 0, total: 0, percentage: 0 });
    const [cancelled, setCancelled] = useState(false);

    const scanPhotos = async (
        album?: MediaLibrary.Album | null,
        onProgress?: (progress: ScanProgress) => void
    ): Promise<MediaLibrary.Asset[]> => {
        setScanning(true);
        setCancelled(false);
        
        const allPhotos: MediaLibrary.Asset[] = [];
        const BATCH_SIZE = 1000;
        let hasMore = true;
        let after: string | undefined;

        try {
            const firstBatch = await MediaLibrary.getAssetsAsync({
                first: 1,
                mediaType: 'photo',
                album: album || undefined,
            });

            const total = firstBatch.totalCount;
            setProgress({ current: 0, total, percentage: 0 });
            onProgress?.({ current: 0, total, percentage: 0 });

            while (hasMore && !cancelled) {
                const result = await MediaLibrary.getAssetsAsync({
                    first: BATCH_SIZE,
                    after,
                    mediaType: 'photo',
                    album: album || undefined,
                    sortBy: ['creationTime'],
                });

                allPhotos.push(...result.assets);
                hasMore = result.hasNextPage;
                after = result.endCursor;

                const current = allPhotos.length;
                const percentage = Math.round((current / total) * 100);
                
                setProgress({ current, total, percentage });
                onProgress?.({ current, total, percentage });

                await new Promise(resolve => setTimeout(resolve, 10));
            }

            return cancelled ? [] : allPhotos;
        } finally {
            setScanning(false);
            setProgress({ current: 0, total: 0, percentage: 0 });
        }
    };

    const cancelScan = () => {
        setCancelled(true);
    };

    return {
        scanning,
        progress,
        scanPhotos,
        cancelScan,
    };
}
