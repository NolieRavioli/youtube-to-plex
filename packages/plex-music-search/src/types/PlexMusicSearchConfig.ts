import { SearchConfig } from "@youtube-to-plex/music-search/types/SearchConfig";
import { MusicSearchConfig } from "@youtube-to-plex/music-search/types/MusicSearchConfig";
import { PlexMusicSearchApproach } from "./PlexMusicSearchApproach";


export type PlexMusicSearchConfig = SearchConfig & {
    token: string;
    uri: string;
    searchApproaches?: PlexMusicSearchApproach[];
    musicSearchConfig?: MusicSearchConfig;
};
