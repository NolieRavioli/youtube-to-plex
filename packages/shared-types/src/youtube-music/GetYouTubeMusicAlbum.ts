import { Track } from './Track';

export type GetYouTubeMusicAlbum = {
    type: "youtube-music-album";
    id: string;
    title: string;
    private?: boolean;
    added?: boolean
    user_title?: string
    image: string;
    tracks: Track[];
};
