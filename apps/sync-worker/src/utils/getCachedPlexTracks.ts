import { getCachedTrackLinks } from "@youtube-to-plex/shared-utils/cache/getCachedTrackLink";
import { GetYouTubeMusicAlbum } from "@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicAlbum";
import { GetYouTubeMusicPlaylist } from "@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicPlaylist";
import { PlexTrack } from "@youtube-to-plex/plex-music-search/types/PlexTrack";
import { SearchResponse } from "@youtube-to-plex/plex-music-search/types/SearchResponse";
import { getById } from "@youtube-to-plex/plex-music-search/functions/getById";
import { PlexMusicSearchConfig } from "@youtube-to-plex/plex-music-search/types/PlexMusicSearchConfig";

export async function getCachedPlexTracks(plexSearchConfig: PlexMusicSearchConfig, data: GetYouTubeMusicPlaylist | GetYouTubeMusicAlbum) {
    const { add, found: cachedTrackLinks } = getCachedTrackLinks(data.tracks, 'plex');
    const result: SearchResponse[] = [];

    for (let i = 0; i < data.tracks.length; i++) {
        const searchItem = data.tracks[i];
        if (!searchItem?.id)
            continue;

        // Process if no cached link has been found
        const trackLink = cachedTrackLinks.find(item => item.source_id == searchItem.id);
        if (!trackLink?.plex_id || trackLink.plex_id?.length == 0)
            continue;

        // Load the plex tracks data
        const foundTracks: PlexTrack[] = [];

        for (let j = 0; j < trackLink.plex_id.length; j++) {
            const plexId = trackLink.plex_id[j];
            if (!plexId)
                continue;

            try {
                const metaData = await getById(plexSearchConfig, plexId);

                if (metaData)
                    foundTracks.push(metaData);
            } catch (_e) {
            }
        }

        // Try searching again if no tracks are found
        if (foundTracks.length == 0)
            continue;

        // Add the result
        result.push({
            id: searchItem.id,
            title: searchItem.title,
            artist: searchItem.artists?.[0] || 'Unknown',
            album: searchItem.album || "",
            result: foundTracks
        });
    }

    return { add, result };
}
