import axios from 'axios';
import { MusicBrainzRecordingSearchResponse } from '@youtube-to-plex/shared-types/musicbrainz/MusicBrainzRecordingSearchResponse';
import { compareTitles } from '../music/compareTitles';
import { rateLimitDelay } from '../lidarr/utils/rateLimitDelay';
import { withRetry } from '../lidarr/utils/withRetry';
import { MusicBrainzRecordingResult } from './getMusicBrainzRecordingByYouTubeId';

const MB_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'youtube-to-plex/1.0 (github.com/NolieRavioli/youtube-to-plex)';
const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Search MusicBrainz recordings by title and artist text.
 *
 * Scores up to 5 candidates using title similarity, artist similarity, and an
 * optional duration proximity bonus. Returns the best match only if its
 * combined confidence meets the threshold.
 */
export async function getMusicBrainzRecordingBySearch(
    title: string,
    artist: string,
    durationMs?: number
): Promise<MusicBrainzRecordingResult | null> {
    try {
        await rateLimitDelay();

        // Use Lucene field prefixes for more precise results
        const query = `artist:"${artist}" AND recording:"${title}"`;
        const url = `${MB_API}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
        const response = await withRetry(() =>
            axios.get<MusicBrainzRecordingSearchResponse>(url, {
                headers: { 'User-Agent': USER_AGENT }
            })
        );

        const recordings = response.data.recordings;
        if (!recordings || recordings.length === 0)
            return null;

        let bestMbid = '';
        let bestTitle = '';
        let bestArtist = '';
        let bestScore = 0;

        for (const recording of recordings) {
            const mbArtist = recording['artist-credit']?.[0]?.artist?.name ?? '';
            if (!mbArtist) continue;

            const titleSimilarity = compareTitles(title, recording.title).similarity;
            const artistSimilarity = compareTitles(artist, mbArtist).similarity;

            let score: number;
            if (durationMs && recording.length) {
                const maxDuration = Math.max(durationMs, recording.length);
                const durationScore = 1 - Math.abs(durationMs - recording.length) / maxDuration;
                score = (titleSimilarity + artistSimilarity + durationScore * 0.5) / 2.5;
            } else {
                score = (titleSimilarity + artistSimilarity) / 2;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMbid = recording.id;
                bestTitle = recording.title;
                bestArtist = mbArtist;
            }
        }

        if (bestScore < CONFIDENCE_THRESHOLD || !bestMbid)
            return null;

        return { mbid: bestMbid, title: bestTitle, artist: bestArtist };
    } catch (_e) {
        return null;
    }
}
