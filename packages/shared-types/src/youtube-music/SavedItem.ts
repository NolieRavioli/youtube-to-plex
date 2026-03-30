export type SavedItem = {
    type: "youtube-music-album" | "youtube-music-playlist" | "youtube-music-liked" | "plex-media"
    uri: string
    id: string
    title: string
    image: string
    user?: string;
    label?: string
    sync?: boolean
    sync_interval?: string
}
