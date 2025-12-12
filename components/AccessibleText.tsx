import useAccessibility from '@/hooks/useAccessibility';
import { ReactNode } from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

interface Props extends TextProps {
    children: ReactNode;
    variant?: 'body' | 'title' | 'subtitle' | 'caption';
    highContrast?: boolean;
}

const fontSizes = {
    body: 16,
    title: 24,
    subtitle: 18,
    caption: 14,
};

export default function AccessibleText({
    children,
    variant = 'body',
    highContrast = false,
    style,
    ...props
}: Props) {
    const { isBoldTextEnabled, isInvertColorsEnabled } = useAccessibility();

    const baseSize = fontSizes[variant];
    const adjustedSize = baseSize * 1.2;

    const textStyle: TextStyle = {
        fontSize: adjustedSize,
        fontWeight: isBoldTextEnabled ? '700' : '400',
        color: highContrast || isInvertColorsEnabled ? '#FFFFFF' : undefined,
    };

    return (
        <Text
            style={[textStyle, style]}
            allowFontScaling={true}
            maxFontSizeMultiplier={2}
            {...props}
        >
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        includeFontPadding: false,
    },
});
