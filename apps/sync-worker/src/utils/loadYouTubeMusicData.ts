import { getDecryptedYouTubeMusicTokens, getYouTubeMusicUser } from "@youtube-to-plex/shared-utils/youtube-music/credentials";
import { resolveYouTubeMusicData } from "@youtube-to-plex/shared-utils/youtube-music/service";

export async function loadYouTubeMusicData(uri: string, user?: string, simplified: boolean = false) {
    let effectiveUserId = user;
    if (!effectiveUserId && uri.startsWith('ytmusic:liked:'))
        effectiveUserId = uri.slice('ytmusic:liked:'.length).trim();

    const token = effectiveUserId ? getDecryptedYouTubeMusicTokens(effectiveUserId) : undefined;
    const userData = effectiveUserId ? getYouTubeMusicUser(effectiveUserId) : undefined;

    if (uri.startsWith('ytmusic:liked:') && !token)
        throw new Error(`User authentication required for liked songs. Reconnect YouTube Music for user ID: ${effectiveUserId}`);

    return resolveYouTubeMusicData({
        source: uri,
        simplified,
        token,
        user_id: effectiveUserId,
        user_name: userData?.user.name
    });
}
