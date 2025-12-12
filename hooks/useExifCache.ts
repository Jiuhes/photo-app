import * as MediaLibrary from 'expo-media-library';
import { useRef } from 'react';

export interface ExifData {
    Model?: string | null;
    DeviceModel?: string | null;
    FNumber?: string | null;
    ExposureTime?: string | null;
    ISOSpeedRatings?: string | null;
}

export interface PhotoAsset extends MediaLibrary.Asset {
    exif?: ExifData;
    thumbnailUri?: string;
}

export function useExifCache() {
    const exifCacheRef = useRef<Map<string, ExifData>>(new Map());

    const loadExifInBackground = async (
        photos: PhotoAsset[],
        onUpdate: (updatedPhotos: PhotoAsset[]) => void
    ) => {
        const BATCH_SIZE = 5;
        
        for (let i = 0; i < photos.length; i += BATCH_SIZE) {
            const batch = photos.slice(i, i + BATCH_SIZE).filter(p => !exifCacheRef.current.has(p.id));
            if (batch.length === 0) continue;

            const results = await Promise.all(
                batch.map(async (photo) => {
                    try {
                        const info = await MediaLibrary.getAssetInfoAsync(photo.id);
                        const exif = (info.exif || {}) as ExifData;
                        return { id: photo.id, exif };
                    } catch {
                        return null;
                    }
                })
            );

            const valid = results.filter(r => r !== null) as { id: string; exif: ExifData }[];
            valid.forEach(r => exifCacheRef.current.set(r.id, r.exif));

            if (valid.length > 0) {
                const updatedPhotos = photos.map(p => {
                    const found = valid.find(r => r.id === p.id);
                    return found ? { ...p, exif: found.exif } : p;
                });
                onUpdate(updatedPhotos);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    const clearCache = () => {
        exifCacheRef.current.clear();
    };

    return {
        loadExifInBackground,
        clearCache,
    };
}
