import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface PhotoAsset {
    id: string;
    uri: string;
    filename?: string;
    width?: number;
    height?: number;
    creationTime?: number;
    modificationTime?: number;
    exif?: {
        Model?: string | null;
        DeviceModel?: string | null;
        Make?: string | null;
        FNumber?: string | null;
        ExposureTime?: string | null;
        ISOSpeedRatings?: string | null;
        FocalLength?: string | null;
        LensModel?: string | null;
        GPSLatitude?: number | null;
        GPSLongitude?: number | null;
        DateTimeOriginal?: string | null;
    };
}

interface Props {
    photo: PhotoAsset;
    visible: boolean;
    onClose: () => void;
}

export default function PhotoInfoSheet({ photo, visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const [fullInfo, setFullInfo] = useState<MediaLibrary.AssetInfo | null>(null);

    useEffect(() => {
        if (visible && photo.id) {
            MediaLibrary.getAssetInfoAsync(photo.id).then(setFullInfo).catch(() => { });
        }
    }, [visible, photo.id]);

    if (!visible) return null;

    type ExifData = {
        Model?: string | null;
        DeviceModel?: string | null;
        Make?: string | null;
        FNumber?: string | number | null;
        ExposureTime?: string | number | null;
        ISOSpeedRatings?: string | number | null;
        FocalLength?: string | number | null;
        LensModel?: string | null;
        GPSLatitude?: number | null;
        GPSLongitude?: number | null;
    };

    const exif: ExifData = (fullInfo?.exif || photo.exif || {}) as ExifData;
    const creationDate = photo.creationTime ? new Date(photo.creationTime) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return '--';
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '--';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatExposure = (time: string | number | null | undefined) => {
        if (!time) return '--';
        const t = typeof time === 'string' ? parseFloat(time) : time;
        return t < 1 ? `1/${Math.round(1 / t)}s` : `${t}s`;
    };

    const formatFNumber = (f: string | number | null | undefined) => {
        if (!f) return '--';
        const num = typeof f === 'string' ? parseFloat(f) : f;
        return `f/${num.toFixed(1)}`;
    };

    const formatFocalLength = (fl: string | number | null | undefined) => {
        if (!fl) return '--';
        const num = typeof fl === 'string' ? parseFloat(fl) : fl;
        return `${num.toFixed(0)}mm`;
    };

    const infoSections = [
        {
            title: '基本信息',
            icon: 'information-circle',
            items: [
                { label: '文件名', value: photo.filename || fullInfo?.filename || '--' },
                { label: '尺寸', value: photo.width && photo.height ? `${photo.width} × ${photo.height}` : '--' },
                { label: '拍摄时间', value: formatDate(creationDate) },
            ],
        },
        {
            title: '相机信息',
            icon: 'camera',
            items: [
                { label: '设备', value: exif.Model || exif.DeviceModel || '--' },
                { label: '制造商', value: exif.Make || '--' },
                { label: '镜头', value: exif.LensModel || '--' },
            ],
        },
        {
            title: '拍摄参数',
            icon: 'aperture',
            items: [
                { label: '光圈', value: formatFNumber(exif.FNumber) },
                { label: '快门', value: formatExposure(exif.ExposureTime) },
                { label: 'ISO', value: exif.ISOSpeedRatings ? `ISO ${exif.ISOSpeedRatings}` : '--' },
                { label: '焦距', value: formatFocalLength(exif.FocalLength) },
            ],
        },
    ];

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
            <Animated.View
                entering={SlideInDown.springify().damping(20)}
                exiting={SlideOutDown.duration(200)}
                style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
            >
                <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>照片信息</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {infoSections.map((section, idx) => (
                            <View key={idx} style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name={section.icon as any} size={16} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                </View>
                                <View style={styles.sectionContent}>
                                    {section.items.map((item, itemIdx) => (
                                        <View key={itemIdx} style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>{item.label}</Text>
                                            <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}

                        {exif.GPSLatitude && exif.GPSLongitude && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="location" size={16} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.sectionTitle}>位置</Text>
                                </View>
                                <View style={styles.sectionContent}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>坐标</Text>
                                        <Text style={styles.infoValue}>
                                            {exif.GPSLatitude?.toFixed(4)}, {exif.GPSLongitude?.toFixed(4)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        maxHeight: height * 0.7,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    blurContainer: {
        flex: 1,
        padding: 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        gap: 20,
    },
    section: {
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    infoLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    infoValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        maxWidth: '60%',
        textAlign: 'right',
    },
});
