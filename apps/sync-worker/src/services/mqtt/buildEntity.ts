import { SavedItem } from '@youtube-to-plex/shared-types/youtube-music/SavedItem';

/**
 * Build MQTT entity from SavedItem and Plex data
 */
export function buildEntity(savedItem: SavedItem, plexId: string, plexThumb: string) {
    const category = savedItem.label || '';
    const categoryId = category.toLowerCase();

    // Determine icon based on type
    let icon = 'mdi:playlist-music';
    if (savedItem.type === 'youtube-music-album') {
        icon = 'mdi:album';
    } else if (savedItem.type === 'youtube-music-liked') {
        icon = 'mdi:heart';
    } else if (savedItem.type === 'plex-media') {
        icon = 'mdi:music-box-multiple';
    }

    return {
        id: savedItem.id,
        category,
        category_id: categoryId,
        name: savedItem.title,
        media_content_id: `/library/metadata/${plexId}`,
        thumb: plexThumb,
        icon,
        friendly_name: savedItem.title,
    };
}
