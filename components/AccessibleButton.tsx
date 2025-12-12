import { AccessibilitySpacing } from '@/constants/AccessibilityTheme';
import useAccessibility from '@/hooks/useAccessibility';
import { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface Props extends Omit<TouchableOpacityProps, 'accessibilityRole'> {
    children: ReactNode;
    label: string;
    hint?: string;
    role?: 'button' | 'link';
}

export default function AccessibleButton({
    children,
    label,
    hint,
    role = 'button',
    style,
    onPress,
    ...props
}: Props) {
    const { isScreenReaderEnabled, announceForAccessibility } = useAccessibility();

    const handlePress = (event: any) => {
        if (isScreenReaderEnabled) {
            announceForAccessibility(`${label} 已激活`);
        }
        onPress?.(event);
    };

    return (
        <TouchableOpacity
            accessible={true}
            accessibilityLabel={label}
            accessibilityHint={hint}
            accessibilityRole={role as any}
            style={[
                styles.button,
                isScreenReaderEnabled && styles.buttonAccessible,
                style,
            ]}
            onPress={handlePress}
            {...props}
        >
            {children}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: AccessibilitySpacing.minTouchTarget,
        minWidth: AccessibilitySpacing.minTouchTarget,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonAccessible: {
        minHeight: AccessibilitySpacing.touchTarget,
        minWidth: AccessibilitySpacing.touchTarget,
        padding: AccessibilitySpacing.spacing.md,
    },
});
