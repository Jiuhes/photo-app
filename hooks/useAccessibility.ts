import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

interface AccessibilityState {
    isScreenReaderEnabled: boolean;
    isBoldTextEnabled: boolean;
    isGrayscaleEnabled: boolean;
    isInvertColorsEnabled: boolean;
    isReduceMotionEnabled: boolean;
    isReduceTransparencyEnabled: boolean;
    preferredContentSizeCategory?: string;
}

export default function useAccessibility() {
    const [state, setState] = useState<AccessibilityState>({
        isScreenReaderEnabled: false,
        isBoldTextEnabled: false,
        isGrayscaleEnabled: false,
        isInvertColorsEnabled: false,
        isReduceMotionEnabled: false,
        isReduceTransparencyEnabled: false,
    });

    useEffect(() => {
        const checkAccessibilityFeatures = async () => {
            try {
                const [
                    screenReader,
                    boldText,
                    grayscale,
                    invertColors,
                    reduceMotion,
                    reduceTransparency,
                ] = await Promise.all([
                    AccessibilityInfo.isScreenReaderEnabled(),
                    AccessibilityInfo.isBoldTextEnabled?.() ?? Promise.resolve(false),
                    AccessibilityInfo.isGrayscaleEnabled?.() ?? Promise.resolve(false),
                    AccessibilityInfo.isInvertColorsEnabled?.() ?? Promise.resolve(false),
                    AccessibilityInfo.isReduceMotionEnabled?.() ?? Promise.resolve(false),
                    AccessibilityInfo.isReduceTransparencyEnabled?.() ?? Promise.resolve(false),
                ]);

                setState({
                    isScreenReaderEnabled: screenReader,
                    isBoldTextEnabled: boldText,
                    isGrayscaleEnabled: grayscale,
                    isInvertColorsEnabled: invertColors,
                    isReduceMotionEnabled: reduceMotion,
                    isReduceTransparencyEnabled: reduceTransparency,
                });
            } catch (error) {
                if (__DEV__) {
                    console.warn('Failed to check accessibility features:', error);
                }
            }
        };

        checkAccessibilityFeatures();

        const screenReaderSubscription = AccessibilityInfo.addEventListener(
            'screenReaderChanged',
            (enabled) => {
                setState((prev) => ({ ...prev, isScreenReaderEnabled: enabled }));
            }
        );

        const boldTextSubscription = AccessibilityInfo.addEventListener(
            'boldTextChanged',
            (enabled) => {
                setState((prev) => ({ ...prev, isBoldTextEnabled: enabled }));
            }
        );

        const reduceMotionSubscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            (enabled) => {
                setState((prev) => ({ ...prev, isReduceMotionEnabled: enabled }));
            }
        );

        return () => {
            screenReaderSubscription?.remove();
            boldTextSubscription?.remove();
            reduceMotionSubscription?.remove();
        };
    }, []);

    const announceForAccessibility = (message: string) => {
        AccessibilityInfo.announceForAccessibility(message);
    };

    const setAccessibilityFocus = (reactTag: number) => {
        if (Platform.OS === 'ios') {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
    };

    return {
        ...state,
        announceForAccessibility,
        setAccessibilityFocus,
    };
}
