export interface AccessibilityColors {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
}

export const HighContrastDark: AccessibilityColors = {
    background: '#000000',
    surface: '#1A1A1A',
    primary: '#FFFFFF',
    secondary: '#00FF00',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#FFFFFF',
    error: '#FF0000',
    success: '#00FF00',
    warning: '#FFFF00',
};

export const HighContrastLight: AccessibilityColors = {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#000000',
    secondary: '#0000FF',
    text: '#000000',
    textSecondary: '#333333',
    border: '#000000',
    error: '#CC0000',
    success: '#008000',
    warning: '#FF8C00',
};

export const getAccessibilityTheme = (
    isDark: boolean = true,
    highContrast: boolean = false
): AccessibilityColors => {
    if (highContrast) {
        return isDark ? HighContrastDark : HighContrastLight;
    }

    return isDark
        ? {
              background: '#000000',
              surface: '#1C1B1F',
              primary: '#BB86FC',
              secondary: '#03DAC6',
              text: '#E6E1E5',
              textSecondary: '#CAC4D0',
              border: '#938F99',
              error: '#CF6679',
              success: '#4CAF50',
              warning: '#FFC107',
          }
        : {
              background: '#FFFBFE',
              surface: '#FFFFFF',
              primary: '#6750A4',
              secondary: '#625B71',
              text: '#1C1B1F',
              textSecondary: '#49454F',
              border: '#79747E',
              error: '#B3261E',
              success: '#2E7D32',
              warning: '#F57C00',
          };
};

export const AccessibilitySpacing = {
    touchTarget: 48,
    minTouchTarget: 44,
    spacing: {
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
    },
};

export const AccessibilityFontSizes = {
    small: 12,
    body: 16,
    subtitle: 18,
    title: 24,
    headline: 32,
    display: 48,
};
