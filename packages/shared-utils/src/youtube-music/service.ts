import axios from 'axios';
import { GetYouTubeMusicAlbum } from '@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicAlbum';
import { GetYouTubeMusicPlaylist } from '@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicPlaylist';
import { Track } from '@youtube-to-plex/shared-types/youtube-music/Track';

export type YouTubeMusicServiceTokenPayload = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    expires_at?: number;
}

type ResolveYouTubeMusicRequest = {
    source: string;
    simplified?: boolean;
    user_id?: string;
    user_name?: string;
    token?: YouTubeMusicServiceTokenPayload;
}

type ListLibraryRequest = {
    token: YouTubeMusicServiceTokenPayload;
    user_id?: string;
}

function getServiceBaseUrl() {
    return process.env.YTMUSIC_SERVICE_URL?.trim() || 'http://localhost:3020';
}

async function post<T>(path: string, body: object) {
    const response = await axios.post<T>(`${getServiceBaseUrl()}${path}`, body, {
        timeout: 60_000
    });

    return response.data;
}

export async function resolveYouTubeMusicData(request: ResolveYouTubeMusicRequest) {
    return post<GetYouTubeMusicAlbum | GetYouTubeMusicPlaylist>('/resolve', request);
}

export async function listYouTubeMusicLibraryPlaylists(request: ListLibraryRequest) {
    return post<GetYouTubeMusicPlaylist[]>('/library/playlists', request);
}

export async function listYouTubeMusicLibraryAlbums(request: ListLibraryRequest) {
    return post<GetYouTubeMusicAlbum[]>('/library/albums', request);
}

export async function listYouTubeMusicLikedSongs(request: ListLibraryRequest) {
    return post<GetYouTubeMusicPlaylist[]>('/library/liked-songs', request);
}

export async function getYouTubeMusicTrack(videoId: string, token?: YouTubeMusicServiceTokenPayload) {
    return post<Track>('/track', {
        video_id: videoId,
        token
    });
}
