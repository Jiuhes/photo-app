import { deleteAsync, documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';

export interface AppSettings {
    lastAlbumId?: string | null;
    lastViewMode?: 'masonry' | 'tinder';
    sortMode?: 'time' | 'random';
    showExif?: boolean;
    photoCount?: number;
}

const SETTINGS_FILE = documentDirectory + 'app_settings.json';

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>({
        showExif: true,
        photoCount: 50,
    });

    const loadSettings = async () => {
        try {
            const info = await getInfoAsync(SETTINGS_FILE);
            if (info.exists) {
                const content = await readAsStringAsync(SETTINGS_FILE);
                const loaded = JSON.parse(content);
                setSettings(prev => ({ ...prev, ...loaded }));
            }
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to load settings:', error);
            }
        }
    };

    const saveSettings = async (updates: Partial<AppSettings>) => {
        try {
            const newSettings = { ...settings, ...updates };
            setSettings(newSettings);
            await writeAsStringAsync(SETTINGS_FILE, JSON.stringify(newSettings));
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to save settings:', error);
            }
        }
    };

    const clearSettings = async () => {
        try {
            await deleteAsync(SETTINGS_FILE);
            setSettings({
                showExif: true,
                photoCount: 50,
            });
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to clear settings:', error);
            }
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    return {
        settings,
        saveSettings,
        clearSettings,
        settingsFile: SETTINGS_FILE,
    };
}
