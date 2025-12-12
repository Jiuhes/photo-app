import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    accent: string;
    accentSecondary: string;
    danger: string;
    success: string;
    overlay: string;
    blur: 'light' | 'dark';
}

const lightColors: ThemeColors = {
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceVariant: 'rgba(0,0,0,0.05)',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: 'rgba(0,0,0,0.1)',
    accent: '#667eea',
    accentSecondary: '#764ba2',
    danger: '#ff4757',
    success: '#2ed573',
    overlay: 'rgba(0,0,0,0.5)',
    blur: 'light',
};

const fonts = {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
};

const darkColors: ThemeColors = {
    background: '#000000',
    surface: '#1a1a1a',
    surfaceVariant: 'rgba(255,255,255,0.08)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    textTertiary: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)',
    accent: '#667eea',
    accentSecondary: '#764ba2',
    danger: '#ff6b6b',
    success: '#51cf66',
    overlay: 'rgba(0,0,0,0.8)',
    blur: 'dark',
};

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const THEME_FILE = documentDirectory + 'theme.json';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const info = await getInfoAsync(THEME_FILE);
            if (info.exists) {
                const content = await readAsStringAsync(THEME_FILE);
                const data = JSON.parse(content);
                setModeState(data.mode || 'dark');
            }
        } catch { }
    };

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await writeAsStringAsync(THEME_FILE, JSON.stringify({ mode: newMode }));
        } catch { }
    };

    const isDark = mode === 'system'
        ? systemScheme === 'dark'
        : mode === 'dark';

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        return {
            mode: 'dark' as ThemeMode,
            isDark: true,
            colors: darkColors,
            setMode: () => { },
        };
    }
    return context;
}

export { darkColors, fonts, lightColors };
export type { ThemeColors, ThemeMode };

