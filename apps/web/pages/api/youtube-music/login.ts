import { generateError } from '@/helpers/errors/generateError';
import { randomBytes } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
            const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();

            if (!redirectUri)
                throw new Error('Missing environment variables: GOOGLE_OAUTH_REDIRECT_URI');

            if (!clientId)
                throw new Error('Missing environment variables: GOOGLE_OAUTH_CLIENT_ID');

            const { host } = req.headers;
            const forwardedProto = req.headers['x-forwarded-proto'];
            const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'http';
            const localTokenUrl = `${protocol}://${host || 'localhost'}/api/youtube-music/token`;

            const csrf = randomBytes(16).toString('hex');
            const state = Buffer.from(JSON.stringify({
                return_url: localTokenUrl,
                csrf
            })).toString('base64');

            const cookieParts = [
                `ytmusic_oauth_state=${csrf}`,
                'HttpOnly',
                'Path=/',
                'Max-Age=900',
                'SameSite=Lax'
            ];
            if (protocol === 'https')
                cookieParts.push('Secure');

            res.setHeader('Set-Cookie', cookieParts.join('; '));

            const scopes = [
                'https://www.googleapis.com/auth/youtube',
                'openid',
                'email',
                'profile'
            ].join(' ');

            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', clientId);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', scopes);
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('include_granted_scopes', 'true');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', state);

            return res.redirect(302, authUrl.toString());
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music login", err);
    },
});
