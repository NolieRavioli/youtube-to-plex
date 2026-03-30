import axios from 'axios';
import { MusicBrainzUrlResponse } from '@youtube-to-plex/shared-types/musicbrainz/MusicBrainzUrlResponse';
import { MusicBrainzRecording } from '@youtube-to-plex/shared-types/musicbrainz/MusicBrainzRecordingSearchResponse';
import { rateLimitDelay } from '../lidarr/utils/rateLimitDelay';
import { withRetry } from '../lidarr/utils/withRetry';

const MB_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'youtube-to-plex/1.0 (github.com/NolieRavioli/youtube-to-plex)';

export type MusicBrainzRecordingResult = {
    mbid: string;
    title: string;
    artist: string;
};

/**
 * Look up a MusicBrainz recording by YouTube video ID.
 *
 * Step 1: Query the MB URL endpoint with the YouTube watch URL to find recording relations.
 * Step 2: Fetch the full recording entity to get the canonical title and artist.
 *
 * Returns null if the video ID is not in MusicBrainz or any request fails.
 */
export async function getMusicBrainzRecordingByYouTubeId(videoId: string): Promise<MusicBrainzRecordingResult | null> {
    try {
        // Step 1: URL relationship lookup
        await rateLimitDelay();
        const ytUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
        const urlResponse = await withRetry(() =>
            axios.get<MusicBrainzUrlResponse>(
                `${MB_API}/url?resource=${ytUrl}&fmt=json&inc=recording-rels`,
                { headers: { 'User-Agent': USER_AGENT } }
            )
        );

        const recordingRelation = urlResponse.data.relations.find(r => r['target-type'] === 'recording');
        if (!recordingRelation?.recording)
            return null;

        const mbid = recordingRelation.recording.id;

        // Step 2: Full recording lookup for canonical title + artist
        await rateLimitDelay();
        const recordingResponse = await withRetry(() =>
            axios.get<MusicBrainzRecording>(
                `${MB_API}/recording/${mbid}?fmt=json&inc=artist-credits`,
                { headers: { 'User-Agent': USER_AGENT } }
            )
        );

        const recording = recordingResponse.data;
        const artist = recording['artist-credit']?.[0]?.artist?.name;
        if (!artist)
            return null;

        return { mbid, title: recording.title, artist };
    } catch (_e) {
        return null;
    }
}
