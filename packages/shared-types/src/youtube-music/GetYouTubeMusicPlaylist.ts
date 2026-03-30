import { Track } from './Track';

export type GetYouTubeMusicPlaylist = {
    type: "youtube-music-playlist" | "youtube-music-liked";
    id: string;
    added?: boolean
    private?: boolean
    user_id?: string
    title: string;
    user_title?: string
    image: string;
    owner: string;
    tracks: Track[];
};
