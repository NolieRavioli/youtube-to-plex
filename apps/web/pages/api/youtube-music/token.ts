import { encrypt } from '@youtube-to-plex/shared-utils/security/encrypt';
import { readYouTubeMusicUsers, writeYouTubeMusicUsers } from '@youtube-to-plex/shared-utils/youtube-music/credentials';
import { YouTubeMusicCredentials } from '@youtube-to-plex/shared-types/youtube-music/YouTubeMusicCredentials';
import { generateError } from '@/helpers/errors/generateError';
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';

function escapeHtml(str: string) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderAuthErrorPage(title: string, message: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)} - YouTube Music to Plex</title>
    <style>
        body { margin:0; padding:40px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f6f7f8; color:#1f2328; }
        .card { max-width:640px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 8px 30px rgba(15,23,42,0.08); }
        h1 { margin:0 0 12px; font-size:24px; }
        p { margin:0; line-height:1.6; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
    </div>
</body>
</html>`;
}

function getAuthErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (typeof responseData === 'string' && responseData.trim())
            return responseData;

        if (responseData && typeof responseData === 'object') {
            const data = responseData as Record<string, unknown>;
            const errorDescription = data.error_description;
            const errorCode = data.error;

            if (typeof errorDescription === 'string' && errorDescription.trim())
                return errorDescription;

            if (typeof errorCode === 'string' && errorCode.trim())
                return errorCode;
        }

        if (typeof error.message === 'string' && error.message.trim())
            return error.message;
    }

    if (error instanceof Error && error.message.trim())
        return error.message;

    if (typeof error === 'string' && error.trim())
        return error;

    return 'Authentication failed while exchanging the Google authorization code.';
}

function getCookie(req: NextApiRequest, name: string) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader)
        return undefined;

    const cookies = cookieHeader.split(';').map(item => item.trim());
    const cookie = cookies.find(item => item.startsWith(`${name}=`));
    if (!cookie)
        return undefined;

    return cookie.slice(name.length + 1);
}

function clearStateCookie(res: NextApiResponse) {
    res.setHeader('Set-Cookie', 'ytmusic_oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

function validateState(req: NextApiRequest) {
    const expected = getCookie(req, 'ytmusic_oauth_state');
    const stateQuery = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
    if (!expected || !stateQuery)
        return false;

    if (stateQuery === expected)
        return true;

    try {
        const decoded = JSON.parse(Buffer.from(stateQuery, 'base64').toString('utf8')) as { csrf?: string };
        return decoded.csrf === expected;
    } catch {
        return false;
    }
}

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            if (req.query.error) {
                clearStateCookie(res);
                res.setHeader('Content-Type', 'text/html');
                return res.status(400).send(renderAuthErrorPage(
                    'Authorization Denied',
                    'Google authorization was cancelled or denied. Start the YouTube Music connection flow again from the app.'
                ));
            }

            if (!req.query.code) {
                res.setHeader('Content-Type', 'text/html');
                return res.status(400).send(renderAuthErrorPage(
                    'Missing Authorization Code',
                    'No authorization code was returned by Google.'
                ));
            }

            if (!validateState(req)) {
                clearStateCookie(res);
                res.setHeader('Content-Type', 'text/html');
                return res.status(400).send(renderAuthErrorPage(
                    'Invalid OAuth State',
                    'The OAuth state token did not match. Start the connection flow again.'
                ));
            }

            const code = req.query.code as string;
            const redirectUri = (req.query.redirect_uri as string) || process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
            const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
            const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

            if (!redirectUri)
                throw new Error('Missing environment variables: GOOGLE_OAUTH_REDIRECT_URI');

            if (!clientId)
                throw new Error('Missing environment variables: GOOGLE_OAUTH_CLIENT_ID');

            if (!clientSecret)
                throw new Error('Missing environment variables: GOOGLE_OAUTH_CLIENT_SECRET');

            try {
                const tokenResponse = await axios.post(
                    'https://oauth2.googleapis.com/token',
                    new URLSearchParams({
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                        grant_type: 'authorization_code'
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    }
                );

                const { access_token, refresh_token, expires_in, token_type, scope } = tokenResponse.data;
                const userInfoResponse = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                });

                const { sub, name, email, picture } = userInfoResponse.data as {
                    sub: string;
                    name?: string;
                    email?: string;
                    picture?: string;
                };

                const existingUsers = readYouTubeMusicUsers();
                const existingUser = existingUsers.find(item => item.user.id === sub);

                const persistedRefreshToken = refresh_token
                    ? encrypt(refresh_token)
                    : existingUser?.access_token.refresh_token;

                if (!persistedRefreshToken) {
                    throw new Error('Google did not return a refresh token. Reconnect the account with consent so background YouTube Music sync can be authorized.');
                }

                const credentials: YouTubeMusicCredentials = {
                    user: {
                        id: sub,
                        name: name || email || sub,
                        email,
                        picture,
                        sync: existingUser?.user.sync,
                        label: existingUser?.user.label,
                        historySync: existingUser?.user.historySync
                    },
                    access_token: {
                        access_token: encrypt(access_token),
                        refresh_token: persistedRefreshToken,
                        expires_in,
                        token_type,
                        scope
                    },
                    expires_at: Math.floor(Date.now() / 1000) + expires_in
                };

                const mergedUsers = existingUsers
                    .filter(item => item.user.id !== credentials.user.id)
                    .concat({
                        ...credentials,
                        access_token: {
                            ...credentials.access_token,
                            refresh_token: persistedRefreshToken
                        }
                    });

                writeYouTubeMusicUsers(mergedUsers);
                clearStateCookie(res);
                return res.redirect('/manage-users');
            } catch (error) {
                clearStateCookie(res);
                res.setHeader('Content-Type', 'text/html');
                return res.status(400).send(renderAuthErrorPage('Authentication Failed', getAuthErrorMessage(error)));
            }
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music token", err);
    },
});
