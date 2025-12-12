import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteItem, getFavorites, removeFavorite } from '../services/favorites';

const { width } = Dimensions.get('window');
const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (width - 40 - COLUMN_GAP) / NUM_COLUMNS;

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function FavoritesPage({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadFavorites();
        }
    }, [visible]);

    const loadFavorites = async () => {
        setLoading(true);
        const items = await getFavorites();
        const validItems: FavoriteItem[] = [];

        for (const item of items) {
            try {
                const asset = await MediaLibrary.getAssetInfoAsync(item.id);
                if (asset) {
                    validItems.push({ ...item, uri: asset.uri });
                }
            } catch {
                validItems.push(item);
            }
        }

        setFavorites(validItems);
        setLoading(false);
    };

    const handleRemove = async (id: string) => {
        await removeFavorite(id);
        setFavorites(prev => prev.filter(f => f.id !== id));
    };

    const renderItem = useCallback(({ item }: { item: FavoriteItem }) => (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.item}
        >
            <Image
                source={{ uri: item.uri }}
                style={styles.image}
                contentFit="cover"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.gradient}
            >
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item.id)}
                >
                    <Ionicons name="heart-dislike" size={16} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    ), []);

    if (!visible) return null;

    return (
        <Animated.View
            entering={SlideInRight.duration(300)}
            exiting={SlideOutRight.duration(200)}
            style={styles.container}
        >
            <BlurView intensity={95} tint="dark" style={styles.blur}>
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>收藏夹</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{favorites.length}</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>加载中...</Text>
                    </View>
                ) : favorites.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyTitle}>暂无收藏</Text>
                        <Text style={styles.emptyText}>长按照片可添加到收藏夹</Text>
                    </View>
                ) : (
                    <FlatList
                        data={favorites}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        numColumns={NUM_COLUMNS}
                        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
                        columnWrapperStyle={styles.row}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 500,
    },
    blur: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        gap: 12,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    countBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 20,
    },
    row: {
        gap: COLUMN_GAP,
        marginBottom: COLUMN_GAP,
    },
    item: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.3,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 8,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});
