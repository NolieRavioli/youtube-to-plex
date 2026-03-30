import { YouTubeMusicUser } from './YouTubeMusicUser';

export type YouTubeMusicCredentials = {
    user: YouTubeMusicUser
    access_token: {
        access_token: string,
        refresh_token: string,
        expires_in: number,
        token_type: string,
        scope?: string
    },
    expires_at: number
}
