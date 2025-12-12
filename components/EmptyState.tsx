import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Props {
    type: 'no-photos' | 'no-permission' | 'error' | 'no-favorites';
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const configs = {
    'no-photos': {
        icon: 'images-outline',
        defaultTitle: '暂无照片',
        defaultMessage: '当前相册中没有找到照片',
        gradient: ['#667eea', '#764ba2'],
    },
    'no-permission': {
        icon: 'lock-closed-outline',
        defaultTitle: '需要相册权限',
        defaultMessage: '请授权访问相册以浏览照片',
        gradient: ['#f093fb', '#f5576c'],
    },
    'error': {
        icon: 'alert-circle-outline',
        defaultTitle: '出错了',
        defaultMessage: '加载照片时遇到问题',
        gradient: ['#fa709a', '#fee140'],
    },
    'no-favorites': {
        icon: 'heart-outline',
        defaultTitle: '暂无收藏',
        defaultMessage: '长按照片可添加到收藏夹',
        gradient: ['#a8edea', '#fed6e3'],
    },
};

export default function EmptyState({ type, title, message, actionLabel, onAction }: Props) {
    const config = configs[type];
    const scale = useSharedValue(1);
    const rotate = useSharedValue(0);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );
        rotate.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 2000 }),
                withTiming(5, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.iconWrap, iconStyle]}>
                <LinearGradient
                    colors={config.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                >
                    <Ionicons name={config.icon as any} size={48} color="#fff" />
                </LinearGradient>
            </Animated.View>

            <Text style={styles.title}>{title || config.defaultTitle}</Text>
            <Text style={styles.message}>{message || config.defaultMessage}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
                    <LinearGradient
                        colors={config.gradient as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionGradient}
                    >
                        <Text style={styles.actionText}>{actionLabel}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconWrap: {
        marginBottom: 24,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    actionBtn: {
        marginTop: 30,
        borderRadius: 25,
        overflow: 'hidden',
    },
    actionGradient: {
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
