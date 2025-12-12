import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';

const FAVORITES_FILE = documentDirectory + 'favorites.json';

export interface FavoriteItem {
    id: string;
    uri: string;
    addedAt: number;
}

let cache: FavoriteItem[] | null = null;

export async function getFavorites(): Promise<FavoriteItem[]> {
    if (cache) return cache;

    try {
        const info = await getInfoAsync(FAVORITES_FILE);
        if (info.exists) {
            const content = await readAsStringAsync(FAVORITES_FILE);
            cache = JSON.parse(content);
            return cache || [];
        }
    } catch (e) {
        console.log('Load favorites failed', e);
    }
    return [];
}

export async function addFavorite(id: string, uri: string): Promise<boolean> {
    try {
        const favorites = await getFavorites();
        if (favorites.some(f => f.id === id)) {
            return false;
        }

        const newItem: FavoriteItem = {
            id,
            uri,
            addedAt: Date.now(),
        };

        favorites.unshift(newItem);
        cache = favorites;
        await writeAsStringAsync(FAVORITES_FILE, JSON.stringify(favorites));
        return true;
    } catch (e) {
        console.log('Add favorite failed', e);
        return false;
    }
}

export async function removeFavorite(id: string): Promise<boolean> {
    try {
        const favorites = await getFavorites();
        const index = favorites.findIndex(f => f.id === id);
        if (index === -1) return false;

        favorites.splice(index, 1);
        cache = favorites;
        await writeAsStringAsync(FAVORITES_FILE, JSON.stringify(favorites));
        return true;
    } catch (e) {
        console.log('Remove favorite failed', e);
        return false;
    }
}

export async function isFavorite(id: string): Promise<boolean> {
    const favorites = await getFavorites();
    return favorites.some(f => f.id === id);
}

export function clearFavoritesCache() {
    cache = null;
}
