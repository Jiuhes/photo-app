import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PhotoAsset extends MediaLibrary.Asset {
    exif?: any;
    thumbnailUri?: string;
}

interface LoaderOptions {
    albumId?: string;
    sortBy?: any[];
    mediaType?: any[];
    first?: number;
}

interface LoaderState {
    photos: PhotoAsset[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    totalCount: number;
}

export default function usePhotoLoader(options: LoaderOptions = {}) {
    const [state, setState] = useState<LoaderState>({
        photos: [],
        loading: false,
        error: null,
        hasMore: true,
        totalCount: 0,
    });

    const endCursorRef = useRef<string | undefined>(undefined);
    const isLoadingRef = useRef(false);

    const loadPhotos = useCallback(async (reset: boolean = false) => {
        if (isLoadingRef.current) return;

        isLoadingRef.current = true;
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('需要相册访问权限');
            }

            const albumOptions: MediaLibrary.AssetsOptions = {
                first: options.first || 50,
                sortBy: options.sortBy || ['creationTime'],
                mediaType: options.mediaType || ['photo'],
                after: reset ? undefined : endCursorRef.current,
            };

            if (options.albumId) {
                albumOptions.album = options.albumId;
            }

            const result = await MediaLibrary.getAssetsAsync(albumOptions);

            endCursorRef.current = result.endCursor;

            setState(prev => ({
                photos: reset ? result.assets : [...prev.photos, ...result.assets],
                loading: false,
                error: null,
                hasMore: result.hasNextPage,
                totalCount: result.totalCount,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : '加载失败',
            }));
        } finally {
            isLoadingRef.current = false;
        }
    }, [options.albumId, options.first, options.sortBy, options.mediaType]);

    const loadMore = useCallback(() => {
        if (state.hasMore && !state.loading) {
            loadPhotos(false);
        }
    }, [state.hasMore, state.loading, loadPhotos]);

    const refresh = useCallback(() => {
        endCursorRef.current = undefined;
        loadPhotos(true);
    }, [loadPhotos]);

    const loadPhotoExif = useCallback(async (asset: MediaLibrary.Asset): Promise<PhotoAsset> => {
        try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            return {
                ...asset,
                exif: assetInfo.exif,
            };
        } catch (error) {
            if (__DEV__) {
                console.warn('Failed to load EXIF:', error);
            }
            return asset;
        }
    }, []);

    const loadBatchExif = useCallback(async (assets: MediaLibrary.Asset[]): Promise<PhotoAsset[]> => {
        const batchSize = 10;
        const results: PhotoAsset[] = [];

        for (let i = 0; i < assets.length; i += batchSize) {
            const batch = assets.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(asset => loadPhotoExif(asset))
            );
            results.push(...batchResults);
        }

        return results;
    }, [loadPhotoExif]);

    useEffect(() => {
        loadPhotos(true);
    }, [loadPhotos]);

    return {
        photos: state.photos,
        loading: state.loading,
        error: state.error,
        hasMore: state.hasMore,
        totalCount: state.totalCount,
        loadMore,
        refresh,
        loadPhotoExif,
        loadBatchExif,
    };
}
