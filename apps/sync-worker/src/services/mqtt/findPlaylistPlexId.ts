import { PlaylistData } from '@youtube-to-plex/shared-types/dashboard/PlaylistData';

/**
 * Find Plex ID for a playlist by source ID
 */
export function findPlaylistPlexId(sourceId: string, playlists: PlaylistData) {
    const playlist = playlists.data.find(item => item.id === sourceId);

    return playlist?.plex || null;
}
