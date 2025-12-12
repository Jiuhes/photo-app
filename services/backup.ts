import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const BACKUP_FILE = documentDirectory + 'photo_app_backup.json';

interface BackupData {
    version: number;
    exportedAt: string;
    favorites: any[];
    settings: any;
    theme: string;
}

export async function exportBackup(): Promise<boolean> {
    try {
        const favorites = await readFileIfExists(documentDirectory + 'favorites.json');
        const settings = await readFileIfExists(documentDirectory + 'app_settings.json');
        const theme = await readFileIfExists(documentDirectory + 'theme.json');

        const backup: BackupData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            favorites: favorites ? JSON.parse(favorites) : [],
            settings: settings ? JSON.parse(settings) : {},
            theme: theme || 'dark',
        };

        await writeAsStringAsync(BACKUP_FILE, JSON.stringify(backup, null, 2));

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(BACKUP_FILE, {
                mimeType: 'application/json',
                dialogTitle: '导出备份文件',
            });
            return true;
        } else {
            Alert.alert('备份已保存', `文件位置: ${BACKUP_FILE}`);
            return true;
        }
    } catch (error) {
        console.error('Export backup failed:', error);
        Alert.alert('导出失败', '无法创建备份文件');
        return false;
    }
}

export async function importBackup(content: string): Promise<boolean> {
    try {
        const backup: BackupData = JSON.parse(content);

        if (!backup.version || backup.version !== 1) {
            Alert.alert('导入失败', '备份文件版本不兼容');
            return false;
        }

        if (backup.favorites) {
            await writeAsStringAsync(
                documentDirectory + 'favorites.json',
                JSON.stringify(backup.favorites)
            );
        }

        if (backup.settings) {
            await writeAsStringAsync(
                documentDirectory + 'app_settings.json',
                JSON.stringify(backup.settings)
            );
        }

        if (backup.theme) {
            await writeAsStringAsync(
                documentDirectory + 'theme.json',
                JSON.stringify({ mode: backup.theme })
            );
        }

        Alert.alert('导入成功', '备份数据已恢复，请重启应用');
        return true;
    } catch (error) {
        console.error('Import backup failed:', error);
        Alert.alert('导入失败', '备份文件格式错误');
        return false;
    }
}

async function readFileIfExists(path: string): Promise<string | null> {
    try {
        const info = await getInfoAsync(path);
        if (info.exists) {
            return await readAsStringAsync(path);
        }
    } catch { }
    return null;
}

export async function getBackupInfo(): Promise<{ exists: boolean; date?: string; size?: number }> {
    try {
        const info = await getInfoAsync(BACKUP_FILE);
        if (info.exists && !info.isDirectory) {
            const content = await readAsStringAsync(BACKUP_FILE);
            const backup: BackupData = JSON.parse(content);
            return {
                exists: true,
                date: backup.exportedAt,
                size: content.length,
            };
        }
    } catch { }
    return { exists: false };
}
