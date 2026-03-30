import { getStorageDir } from '@youtube-to-plex/shared-utils/utils/getStorageDir';
import { SavedItem } from "@youtube-to-plex/shared-types/youtube-music/SavedItem";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function getSavedPlaylists() {

    // Get all saved items
    const savedItemsPath = join(getStorageDir(), 'ytmusic_saved_items.json');
    if (!existsSync(savedItemsPath))
        throw new Error(`Found no saved items to sync`);

    const savedItems: SavedItem[] = JSON.parse(readFileSync(savedItemsPath, 'utf8'));
    const toSyncPlaylists = savedItems.filter(item => !!item.sync && (item.type == 'youtube-music-playlist' || item.type === 'youtube-music-liked'));

    if (toSyncPlaylists.length == 0)
        throw new Error(`Found no playlists to sync`);

    return { toSyncPlaylists };
}
