import { TrackLink } from './types';

/**
 * Find Plex ID for an album by source ID
 * Returns the first plex_id if available
 */
export function findAlbumPlexId(sourceId: string, trackLinks: TrackLink[]) {
    const link = trackLinks.find(item => item.source_id === sourceId);

    if (!link?.plex_id || link.plex_id.length === 0) 
        return null;

    return link.plex_id[0] ?? null;
}
