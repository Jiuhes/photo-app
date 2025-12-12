import { ReactNode } from 'react';
import { Platform, Pressable, PressableProps, StyleSheet } from 'react-native';

interface Props extends PressableProps {
    children: ReactNode;
    rippleColor?: string;
    borderless?: boolean;
    radius?: number;
}

export default function MaterialRipple({
    children,
    rippleColor = 'rgba(255, 255, 255, 0.3)',
    borderless = false,
    radius,
    style,
    ...props
}: Props) {
    if (Platform.OS === 'android') {
        return (
            <Pressable
                android_ripple={{
                    color: rippleColor,
                    borderless,
                    radius,
                }}
                style={style}
                {...props}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <Pressable
            style={(state) => [
                typeof style === 'function' ? style(state) : style,
                state.pressed && styles.iosPressed,
            ]}
            {...props}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    iosPressed: {
        opacity: 0.7,
    },
});
