import { ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface Props {
    children: ReactNode;
    mode: 'masonry' | 'tinder';
    onTransitionEnd?: () => void;
}

export default function ViewModeTransition({ children, mode, onTransitionEnd }: Props) {
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    useEffect(() => {
        opacity.value = 0;
        scale.value = 0.95;
        translateY.value = 20;

        opacity.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
        scale.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
        translateY.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        }, () => {
            if (onTransitionEnd) {
                onTransitionEnd();
            }
        });
    }, [mode]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    return (
        <Animated.View
            style={[styles.container, animatedStyle]}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
