import { getStorageDir } from '@youtube-to-plex/shared-utils/utils/getStorageDir';
import { searchAlbum } from "@youtube-to-plex/plex-music-search/functions/searchAlbum";
import { SearchResponse } from "@youtube-to-plex/plex-music-search/types/SearchResponse";
import { getMusicSearchConfig } from "@youtube-to-plex/music-search/functions/getMusicSearchConfig";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { findMissingTidalAlbums } from "../utils/findMissingTidalAlbums";
import { getCachedPlexTracks } from "../utils/getCachedPlexTracks";
import { getSavedAlbums } from "../utils/getSavedAlbums";
import { getNestedSyncLogsForType } from "../utils/getNestedSyncLogsForType";
import { startSyncType } from "../utils/startSyncType";
import { clearSyncTypeLogs } from "../utils/clearSyncTypeLogs";
import { completeSyncType } from "../utils/completeSyncType";
import { errorSyncType } from "../utils/errorSyncType";
import { updateSyncTypeProgress } from "../utils/updateSyncTypeProgress";
import { loadYouTubeMusicData } from "../utils/loadYouTubeMusicData";
import { getSettings } from "@youtube-to-plex/plex-config/functions/getSettings";
import { LidarrAlbumData } from "@youtube-to-plex/shared-types/lidarr/LidarrAlbumData";
import { SlskdTrackData } from "@youtube-to-plex/shared-types/slskd/SlskdTrackData";
import { enrichTrackWithMusicBrainz } from "@youtube-to-plex/shared-utils/musicbrainz/enrichTrackWithMusicBrainz";

export async function syncAlbums() {
    // Start sync type logging
    startSyncType('albums');
    clearSyncTypeLogs('albums');

    try {

        // Check if we need to force syncing
        const args = process.argv.slice(2);
        const force = args.includes("force")

        const { toSyncAlbums } = getSavedAlbums()
        const { putLog, logError, logComplete } = getNestedSyncLogsForType('albums')

        const settings = await getSettings();
        if (!settings.uri || !settings.token)
            throw new Error("No plex connection found")

        const missingYouTubeMusicAlbums: string[] = []
        const missingTidalAlbums: string[] = []
        const missingAlbumsLidarr: LidarrAlbumData[] = []
        const missingTracksSlskd: SlskdTrackData[] = []

        for (let i = 0; i < toSyncAlbums.length; i++) {
            const item = toSyncAlbums[i];
            if (!item)
                continue;

            // Update progress
            updateSyncTypeProgress('albums', i + 1, toSyncAlbums.length);

            const { id, title, uri, user, sync_interval } = item;

            //////////////////////////////////
            // Load Plex playlist
            //////////////////////////////////
            const itemLog = putLog(id, title)
            let days = Number(sync_interval)
            if (isNaN(days))
                days = 0;

            const nextSyncAfter = new Date((itemLog.end || 0) + (days * 24 * 60 * 60 * 1000));
            if (nextSyncAfter.getTime() > Date.now() && !force) {
                console.log(`Next sync on: ${nextSyncAfter.toDateString()}`)
                continue;
            }

            //////////////////////////////////
            // Load YouTube Music data
            //////////////////////////////////
            const data = await loadYouTubeMusicData(uri, user)
            if (!data) {
                logError(itemLog, `YouTube Music data could not be loaded`)
                continue;
            }

            //////////////////////////////////////
            // Load music search configuration and search
            //////////////////////////////////////
            const musicSearchConfig = await getMusicSearchConfig();

            const { searchApproaches } = musicSearchConfig;
            if (!searchApproaches || searchApproaches.length === 0)
                throw new Error(`Search approaches not found`)

            const plexConfig = {
                uri: settings.uri,
                token: settings.token,
                musicSearchConfig,
                searchApproaches
            };
            const result = await searchAlbum(plexConfig, data.tracks);

            //@ts-ignore
            const { add } = await getCachedPlexTracks(plexConfig, data);

            // MusicBrainz enrichment: retry unmatched tracks with canonical metadata
            const unmatchedSearch = (result as SearchResponse[]).filter(r => r.result.length === 0);
            if (unmatchedSearch.length > 0) {
                const unmatchedTracks = data.tracks.filter(t =>
                    unmatchedSearch.some(r => r.id === t.id)
                );
                const enrichedTracks = await Promise.all(unmatchedTracks.map(t => enrichTrackWithMusicBrainz(t)));
                const changedTracks = enrichedTracks.filter((t, i) =>
                    t.title !== unmatchedTracks[i]!.title || t.artists[0] !== unmatchedTracks[i]!.artists[0]
                );
                if (changedTracks.length > 0) {
                    console.log(`MusicBrainz: enriched ${changedTracks.length} unmatched track(s), re-searching…`);
                    const enrichedResult = await searchAlbum(plexConfig, changedTracks);
                    for (const er of enrichedResult) {
                        if (er.result.length > 0) {
                            const idx = (result as SearchResponse[]).findIndex(r => r.id === er.id);
                            if (idx > -1) (result as SearchResponse[])[idx] = er;
                        }
                    }
                }
            }

            const missingTracks = data.tracks.filter(item => {
                const { title: trackTitle, artists: trackArtists } = item;

                return result.some((track: SearchResponse) => track.title == trackTitle && trackArtists.indexOf(track.artist) > - 1 && track.result.length == 0)
            })

            if (!result.some((item: SearchResponse) => item.result.length == 0)) {
                logComplete(itemLog);

                // Store album id
                add(result, 'plex', { id: data.id })
                continue;
            }

            if (!missingYouTubeMusicAlbums.includes(data.id))
                missingYouTubeMusicAlbums.push(data.id)

            console.log(`Some tracks on the album seem to be missing ${data.tracks.length}/ ${missingTracks.length}: ${data.title}`)
            const tidalIds = await findMissingTidalAlbums(missingTracks)
            tidalIds.forEach(tidalId => {
                if (!missingTidalAlbums.includes(tidalId))
                    missingTidalAlbums.push(tidalId)
            })

            // Collect unique albums for Lidarr
            missingTracks.forEach(track => {
            // Skip tracks with unknown album_id (defensive check)
                if (track.album_id === 'unknown') {
                    console.log(`⚠️  Skipping track with unknown album_id: ${track.title} by ${track.artists[0]}`);

                    return;
                }

                const artist = track.artists[0] || 'Unknown Artist';
                const album = track.album || 'Unknown Album';
                const key = `${artist}|${album}`;

                // Check if album already exists in the array
                if (!missingAlbumsLidarr.some(item => `${item.artist_name}|${item.album_name}` === key)) {
                    missingAlbumsLidarr.push({
                        artist_name: artist,
                        album_name: album,
                        source_album_id: data.id
                    });
                }
            });

            // Collect track data for SLSKD
            missingTracks.forEach(track => {
                if (!track.id) return; // Skip tracks with null id (local files/unavailable)
                const sourceId = track.id.indexOf(":") > -1 ? track.id.split(":")[2] : track.id;
                const artist = track.artists[0] || 'Unknown Artist';
                const trackName = track.title || 'Unknown Track';
                const album = track.album || 'Unknown Album';
                const key = `${sourceId}`;

                // Check if track already exists in the array
                if (sourceId && !missingTracksSlskd.some(item => item.source_id === key)) {
                    missingTracksSlskd.push({
                        source_id: sourceId,
                        artist_name: artist,
                        track_name: trackName,
                        album_name: album
                    });
                }
            });

            /////////////////////////////
            // Store logs
            /////////////////////////////
            logComplete(itemLog)

            // Store the missing albums and tracks
            writeFileSync(join(getStorageDir(), 'missing_albums_youtube_music.txt'), missingYouTubeMusicAlbums.map(id => `https://music.youtube.com/browse/${id}`).join('\n'))
            writeFileSync(join(getStorageDir(), 'missing_albums_tidal.txt'), missingTidalAlbums.map(id => `https://tidal.com/browse/album/${id}`).join('\n'))
            writeFileSync(join(getStorageDir(), 'missing_albums_lidarr.json'), JSON.stringify(missingAlbumsLidarr, null, 2))
            writeFileSync(join(getStorageDir(), 'missing_tracks_slskd.json'), JSON.stringify(missingTracksSlskd, null, 2))
        }

        // Mark sync as complete
        completeSyncType('albums');
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        errorSyncType('albums', message);
        throw e;
    }
}


function run() {
    console.log(`Start syncing items`)
    syncAlbums()
        .then(() => {
            console.log(`Sync complete`)
        })
        .catch((e: unknown) => {
            console.log(e)
        })
}

// Only run if this file is executed directly, not when imported
// eslint-disable-next-line unicorn/prefer-module
if (require.main === module) {
    run();
}
