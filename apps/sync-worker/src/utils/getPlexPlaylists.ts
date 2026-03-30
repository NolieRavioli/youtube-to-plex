import { getPlaylists } from "@youtube-to-plex/plex-config/functions/getPlaylists";
import { PlexPlaylists } from "@youtube-to-plex/plex-config/types/PlexPlaylists";

export async function getPlexPlaylists() {
    const plexPlaylists = await getPlaylists();
    let playlists: PlexPlaylists["data"] = plexPlaylists.data || [];
    if (!playlists)
        playlists = [];

    return { playlists };
}
