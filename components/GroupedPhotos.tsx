import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 50) / 3;
const AnimatedImage = Animated.createAnimatedComponent(Image) as any;

interface PhotoAsset {
    id: string;
    uri: string;
    creationTime?: number;
    exif?: {
        Model?: string | null;
        DeviceModel?: string | null;
    };
}

interface Props {
    photos: PhotoAsset[];
    onPhotoPress: (photo: PhotoAsset, index: number) => void;
}

interface PhotoGroup {
    title: string;
    date: Date;
    photos: PhotoAsset[];
}

function groupPhotosByDate(photos: PhotoAsset[]): PhotoGroup[] {
    const groups: Map<string, PhotoGroup> = new Map();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 7 * 86400000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const photo of photos) {
        if (!photo.creationTime) continue;

        const date = new Date(photo.creationTime);
        let key: string;
        let title: string;

        if (date >= today) {
            key = 'today';
            title = '今天';
        } else if (date >= yesterday) {
            key = 'yesterday';
            title = '昨天';
        } else if (date >= thisWeek) {
            key = 'week';
            title = '本周';
        } else if (date >= thisMonth) {
            key = 'month';
            title = '本月';
        } else {
            key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            title = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        }

        if (!groups.has(key)) {
            groups.set(key, { title, date, photos: [] });
        }
        groups.get(key)!.photos.push(photo);
    }

    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function GroupedPhotos({ photos, onPhotoPress }: Props) {
    const insets = useSafeAreaInsets();
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const groups = useMemo(() => groupPhotosByDate(photos), [photos]);

    const toggleGroup = (title: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };

    const getPhotoIndex = (photo: PhotoAsset) => {
        return photos.findIndex(p => p.id === photo.id);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
        >
            {groups.map(group => {
                const isCollapsed = collapsedGroups.has(group.title);

                return (
                    <Animated.View
                        key={group.title}
                        entering={FadeIn.duration(300)}
                        layout={Layout.springify()}
                        style={styles.group}
                    >
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleGroup(group.title)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`${group.title}，${group.photos.length}张照片`}
                        >
                            <View style={styles.groupTitleRow}>
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                <View style={styles.groupBadge}>
                                    <Text style={styles.groupCount}>{group.photos.length}</Text>
                                </View>
                            </View>
                            <Ionicons
                                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                                size={18}
                                color="rgba(255,255,255,0.5)"
                            />
                        </TouchableOpacity>

                        {!isCollapsed && (
                            <Animated.View
                                entering={FadeIn.duration(200)}
                                style={styles.photosGrid}
                            >
                                {group.photos.map(photo => (
                                    <TouchableOpacity
                                        key={photo.id}
                                        style={styles.photoItem}
                                        onPress={() => onPhotoPress(photo, getPhotoIndex(photo))}
                                        activeOpacity={0.8}
                                        accessibilityRole="image"
                                        accessibilityLabel={`照片，${photo.exif?.Model || '未知设备'}拍摄`}
                                    >
                                        <AnimatedImage
                                            source={{ uri: photo.uri }}
                                            style={styles.photoImage}
                                            contentFit="cover"
                                            recyclingKey={photo.id}
                                            sharedTransitionTag={`image-${photo.id}`}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}
                    </Animated.View>
                );
            })}

            {groups.length === 0 && (
                <View style={styles.empty}>
                    <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyText}>暂无带日期的照片</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    group: {
        marginBottom: 20,
        paddingHorizontal: 15,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
    },
    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    groupTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    groupBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    groupCount: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    photoItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});
