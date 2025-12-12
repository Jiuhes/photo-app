import * as MediaLibrary from 'expo-media-library';

export interface PhotoDetail extends MediaLibrary.Asset {
    creationTime: number;
    filename: string;
    width: number;
    height: number;
    uri: string;
}

let storedPhotos: PhotoDetail[] = [];

export const setStoredPhotos = (photos: any[]) => {
    storedPhotos = photos;
};

export const getStoredPhotos = () => {
    return storedPhotos;
};
