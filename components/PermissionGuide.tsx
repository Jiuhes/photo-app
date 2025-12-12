import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Props {
    onPermissionGranted: () => void;
    onUseFallback: () => void;
}

export default function PermissionGuide({ onPermissionGranted, onUseFallback }: Props) {
    const insets = useSafeAreaInsets();

    const handleRequestPermission = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
            onPermissionGranted();
        }
    };

    const handleOpenSettings = () => {
        Linking.openSettings();
    };

    const features = [
        { icon: 'images', text: '浏览所有照片' },
        { icon: 'camera', text: '查看拍摄参数' },
        { icon: 'albums', text: '按相册分类查看' },
        { icon: 'shuffle', text: '随机发现精彩照片' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.iconCircle}
                >
                    <Ionicons name="lock-open" size={48} color="#fff" />
                </LinearGradient>
                <Text style={styles.title}>允许访问相册</Text>
                <Text style={styles.subtitle}>
                    为了让您浏览和管理照片，我们需要访问您的相册
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.features}>
                {features.map((feature, index) => (
                    <Animated.View
                        key={feature.icon}
                        entering={FadeInUp.delay(400 + index * 100).duration(400)}
                        style={styles.featureItem}
                    >
                        <View style={styles.featureIcon}>
                            <Ionicons name={feature.icon as any} size={22} color="#667eea" />
                        </View>
                        <Text style={styles.featureText}>{feature.text}</Text>
                    </Animated.View>
                ))}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.actions}>
                <TouchableOpacity onPress={handleRequestPermission} activeOpacity={0.9}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryBtn}
                    >
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={styles.primaryBtnText}>允许访问</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onUseFallback}>
                    <Ionicons name="folder-open-outline" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.secondaryBtnText}>手动选择照片</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkBtn} onPress={handleOpenSettings}>
                    <Text style={styles.linkText}>前往系统设置</Text>
                    <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(1000).duration(500)} style={styles.privacy}>
                <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.3)" />
                <Text style={styles.privacyText}>
                    我们尊重您的隐私，照片数据仅在本地处理
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingHorizontal: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 12,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    features: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 20,
        gap: 16,
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(102, 126, 234, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        color: '#fff',
        fontSize: 16,
    },
    actions: {
        gap: 14,
        marginBottom: 30,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 30,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    secondaryBtnText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    linkText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
    privacy: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    privacyText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
    },
});
