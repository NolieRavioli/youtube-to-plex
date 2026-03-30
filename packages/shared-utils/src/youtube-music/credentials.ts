import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { decrypt } from '../security/decrypt';
import { getYouTubeMusicUsersPath } from './storage';
import { YouTubeMusicCredentials } from '@youtube-to-plex/shared-types/youtube-music/YouTubeMusicCredentials';

export type DecryptedYouTubeMusicTokens = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
    expires_at: number;
}

export function readYouTubeMusicUsers() {
    const path = getYouTubeMusicUsersPath();
    if (!existsSync(path))
        return [];

    return JSON.parse(readFileSync(path, 'utf8')) as YouTubeMusicCredentials[];
}

export function writeYouTubeMusicUsers(users: YouTubeMusicCredentials[]) {
    writeFileSync(getYouTubeMusicUsersPath(), JSON.stringify(users, undefined, 4));
}

export function getYouTubeMusicUser(userId: string) {
    return readYouTubeMusicUsers().find(item => item.user.id === userId);
}

export function getDecryptedYouTubeMusicTokens(userId: string): DecryptedYouTubeMusicTokens | undefined {
    const user = getYouTubeMusicUser(userId);
    if (!user)
        return undefined;

    return {
        access_token: decrypt(user.access_token.access_token),
        refresh_token: decrypt(user.access_token.refresh_token),
        expires_in: user.access_token.expires_in,
        token_type: user.access_token.token_type,
        scope: user.access_token.scope,
        expires_at: user.expires_at
    };
}
