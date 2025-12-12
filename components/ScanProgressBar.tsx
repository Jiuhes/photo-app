import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

interface Props {
    current: number;
    total: number;
    percentage: number;
}

export default function ScanProgressBar({ current, total, percentage }: Props) {
    const progressStyle = useAnimatedStyle(() => ({
        width: withSpring(`${percentage}%`, { damping: 15 }),
    }));

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                正在扫描相册... {current} / {total}
            </Text>
            <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
            <Text style={styles.percentage}>{percentage}%</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 10,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 2,
    },
    percentage: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 8,
    },
});
