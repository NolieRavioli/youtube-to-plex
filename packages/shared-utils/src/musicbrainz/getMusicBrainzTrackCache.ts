import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getStorageDir } from '../utils/getStorageDir';

type MusicBrainzTrackCache = {
    video_id: string;
    mb_recording_id?: string;
    canonical_title?: string;
    canonical_artist?: string;
    cached_at: number;
    no_match?: true;
};

export function getMusicBrainzTrackCache() {
    const path = join(getStorageDir(), 'track_musicbrainz_links.json');
    let all: MusicBrainzTrackCache[] = [];

    if (existsSync(path))
        all = JSON.parse(readFileSync(path, 'utf8'));

    const get = (videoId: string): MusicBrainzTrackCache | undefined =>
        all.find(item => item.video_id === videoId);

    const add = (entry: Omit<MusicBrainzTrackCache, 'cached_at'>) => {
        all = all.filter(item => item.video_id !== entry.video_id);
        all.push({ ...entry, cached_at: Date.now() });
        writeFileSync(path, JSON.stringify(all, undefined, 4));
    };

    return { path, get, add };
}
