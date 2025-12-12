import { BlurView } from 'expo-blur';
import { deleteAsync } from 'expo-file-system/legacy';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppSettings {
    showExif?: boolean;
    photoCount?: number;
}

interface Props {
    visible: boolean;
    settings: AppSettings;
    settingsFile: string;
    onClose: () => void;
    onUpdateSettings: (updates: Partial<AppSettings>) => void;
    onClearCache: () => void;
}

export default function SettingsModal({
    visible,
    settings,
    settingsFile,
    onClose,
    onUpdateSettings,
    onClearCache
}: Props) {
    const handleClearCache = async () => {
        try {
            await deleteAsync(settingsFile);
            onClearCache();
            Alert.alert('已重置', '所有缓存和设置已清除');
        } catch { }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <BlurView intensity={30} tint="dark" style={styles.centerContainer}>
                <View style={styles.settingsPanel}>
                    <View style={styles.settingsHeader}>
                        <Text style={styles.settingsTitle}>设置</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.settingsClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.settingsItem}
                        onPress={() => onUpdateSettings({ showExif: !settings.showExif })}
                    >
                        <Text style={styles.settingsItemText}>📷 显示机型信息</Text>
                        <View style={[styles.toggle, settings.showExif && styles.toggleOn]}>
                            <View style={[styles.toggleThumb, settings.showExif && styles.toggleThumbOn]} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.settingsItem}>
                        <Text style={styles.settingsItemText}>📊 每次加载</Text>
                        <View style={styles.countSelector}>
                            {[30, 50, 100].map(n => (
                                <TouchableOpacity
                                    key={n}
                                    style={[styles.countBtn, settings.photoCount === n && styles.countBtnActive]}
                                    onPress={() => onUpdateSettings({ photoCount: n })}
                                >
                                    <Text style={[styles.countText, settings.photoCount === n && styles.countTextActive]}>{n}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.settingsItem, { borderBottomWidth: 0 }]}
                        onPress={handleClearCache}
                    >
                        <Text style={[styles.settingsItemText, { color: '#ff6b6b' }]}>🗑️ 清除缓存并重置</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    settingsPanel: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        width: '85%',
        maxWidth: 340,
        overflow: 'hidden',
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    settingsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    settingsClose: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 20,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    settingsItemText: {
        color: '#fff',
        fontSize: 15,
        flex: 1,
    },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 2,
    },
    toggleOn: {
        backgroundColor: '#4CAF50',
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    toggleThumbOn: {
        marginLeft: 20,
    },
    countSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    countBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    countBtnActive: {
        backgroundColor: '#4CAF50',
    },
    countText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    countTextActive: {
        color: '#fff',
    },
});
