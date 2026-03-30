import { Track } from '@youtube-to-plex/shared-types/youtube-music/Track';
import { getMusicBrainzTrackCache } from './getMusicBrainzTrackCache';
import { getMusicBrainzRecordingByYouTubeId } from './getMusicBrainzRecordingByYouTubeId';
import { getMusicBrainzRecordingBySearch } from './getMusicBrainzRecordingBySearch';
import { getMusicBrainzCache } from '../cache/getMusicBrainzCache';

/**
 * Attempt to enrich a YouTube Music track with canonical MusicBrainz metadata.
 *
 * Priority order:
 *   1. Cache hit (instant, no API call)
 *   2. YouTube video ID → MusicBrainz URL relationship lookup
 *   3. MusicBrainz recording text search (title + artist, confidence-gated)
 *
 * Only the title and primary artist are updated when a match is found.
 * All other fields (album, album_id, duration_ms, etc.) remain unchanged.
 *
 * Returns the original track unchanged when:
 *   - The track has no id
 *   - No match is found (and records a no_match cache entry to skip future lookups)
 */
export async function enrichTrackWithMusicBrainz(track: Track): Promise<Track> {
    if (!track.id)
        return track;

    const cache = getMusicBrainzTrackCache();
    const cached = cache.get(track.id);

    if (cached) {
        if (cached.no_match)
            return track;

        return {
            ...track,
            title: cached.canonical_title ?? track.title,
            artists: [
                cached.canonical_artist ?? track.artists[0] ?? '',
                ...track.artists.slice(1),
            ],
        };
    }

    const primaryArtist = track.artists[0] ?? '';

    // Step 1: YouTube video ID → MusicBrainz URL relationship
    let result = await getMusicBrainzRecordingByYouTubeId(track.id);

    // Step 2: Fall back to text search
    if (!result)
        result = await getMusicBrainzRecordingBySearch(track.title, primaryArtist, track.duration_ms);

    if (!result) {
        cache.add({ video_id: track.id, no_match: true });

        return track;
    }

    cache.add({
        video_id: track.id,
        mb_recording_id: result.mbid,
        canonical_title: result.title,
        canonical_artist: result.artist,
    });

    // When the video ID lookup returned a release-group ID, pre-populate the MB
    // album cache so the Lidarr sync job gets a guaranteed cache hit and never
    // has to fall back to an unreliable artist+album name text search.
    if (result.releaseGroupId && track.album_id && track.album_id !== 'unknown') {
        const albumCache = getMusicBrainzCache();
        if (!albumCache.get(track.album_id)) {
            albumCache.add({
                source_album_id: track.album_id,
                musicbrainz_release_group_id: result.releaseGroupId,
                musicbrainz_artist_id: result.artistId ?? '',
            });
        }
    }

    return {
        ...track,
        title: result.title,
        artists: [result.artist, ...track.artists.slice(1)],
    };
}
