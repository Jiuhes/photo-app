import { NativeModules, Platform } from 'react-native';

interface WidgetConfig {
    photoUri: string;
    title?: string;
    updateInterval?: number;
}

class AndroidWidgetManager {
    private isAndroid = Platform.OS === 'android';

    async updateWidget(config: WidgetConfig): Promise<boolean> {
        if (!this.isAndroid) {
            if (__DEV__) {
                console.warn('Widget is only supported on Android');
            }
            return false;
        }

        try {
            const { WidgetModule } = NativeModules;
            if (!WidgetModule) {
                if (__DEV__) {
                    console.warn('WidgetModule not found. Make sure native module is linked.');
                }
                return false;
            }

            await WidgetModule.updateWidget(config);
            return true;
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to update widget:', error);
            }
            return false;
        }
    }

    async setRandomPhoto(photoUri: string): Promise<boolean> {
        return this.updateWidget({
            photoUri,
            title: 'Random Photo',
            updateInterval: 3600000,
        });
    }

    async enableAutoUpdate(enabled: boolean): Promise<boolean> {
        if (!this.isAndroid) return false;

        try {
            const { WidgetModule } = NativeModules;
            if (!WidgetModule) return false;

            await WidgetModule.setAutoUpdate(enabled);
            return true;
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to set auto update:', error);
            }
            return false;
        }
    }

    isSupported(): boolean {
        return this.isAndroid && typeof Platform.Version === 'number' && Platform.Version >= 26;
    }
}

export default new AndroidWidgetManager();
