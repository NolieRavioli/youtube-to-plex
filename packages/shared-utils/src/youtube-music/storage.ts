import { join } from 'node:path';
import { getStorageDir } from '../utils/getStorageDir';

export const YOUTUBE_MUSIC_USERS_FILE = 'ytmusic_users.json';
export const YOUTUBE_MUSIC_SAVED_ITEMS_FILE = 'ytmusic_saved_items.json';

export function getYouTubeMusicUsersPath() {
    return join(getStorageDir(), YOUTUBE_MUSIC_USERS_FILE);
}

export function getYouTubeMusicSavedItemsPath() {
    return join(getStorageDir(), YOUTUBE_MUSIC_SAVED_ITEMS_FILE);
}
