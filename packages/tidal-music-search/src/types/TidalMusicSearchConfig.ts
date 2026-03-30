import { SearchConfig } from "@youtube-to-plex/music-search/types/SearchConfig";
import { MusicSearchConfig } from "@youtube-to-plex/music-search/types/MusicSearchConfig";
import { TidalMusicSearchApproach } from "./TidalMusicSearchApproach";

export type TidalMusicSearchConfig = SearchConfig & {
    clientId: string,
    clientSecret: string,
    searchApproaches?: TidalMusicSearchApproach[];
    musicSearchConfig?: MusicSearchConfig;
};
