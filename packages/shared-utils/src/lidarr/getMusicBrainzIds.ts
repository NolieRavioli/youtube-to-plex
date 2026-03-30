import { getMusicBrainzCache } from '../cache/getMusicBrainzCache';
import { getMusicBrainzIdsByTextSearch } from './getMusicBrainzIdsByTextSearch';

/**
 * Get MusicBrainz release group and artist IDs from source metadata.
 * Uses caching to minimize API calls.
 */
export async function getMusicBrainzIds(sourceAlbumId: string, artistName?: string, albumName?: string) {
    const cache = getMusicBrainzCache();

    const cached = cache.get(sourceAlbumId);
    if (cached) {
        return {
            releaseGroupId: cached.musicbrainz_release_group_id,
            artistId: cached.musicbrainz_artist_id
        };
    }

    if (!artistName || !albumName)
        return null;

    const resolved = await getMusicBrainzIdsByTextSearch(artistName, albumName);
    if (!resolved)
        return null;

    cache.add({
        source_album_id: sourceAlbumId,
        musicbrainz_release_group_id: resolved.releaseGroupId,
        musicbrainz_artist_id: resolved.artistId
    });

    return resolved;
}
