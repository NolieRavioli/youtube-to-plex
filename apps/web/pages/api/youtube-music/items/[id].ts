import { generateError } from '@/helpers/errors/generateError';
import { getDecryptedYouTubeMusicTokens, getYouTubeMusicUser } from '@youtube-to-plex/shared-utils/youtube-music/credentials';
import { resolveYouTubeMusicData } from '@youtube-to-plex/shared-utils/youtube-music/service';
import { getYouTubeMusicSavedItemsPath } from '@youtube-to-plex/shared-utils/youtube-music/storage';
import { SavedItem } from '@youtube-to-plex/shared-types/youtube-music/SavedItem';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { existsSync, readFileSync } from 'node:fs';

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            const { id, full } = req.query;
            if (typeof id !== 'string')
                return res.status(400).json({ error: "ID missing" });

            const savedItemsPath = getYouTubeMusicSavedItemsPath();
            if (!existsSync(savedItemsPath))
                return res.status(200).json([]);

            const savedItems: SavedItem[] = JSON.parse(readFileSync(savedItemsPath, 'utf8'));
            const savedItem = savedItems.find(item => item.id === id);
            if (!savedItem)
                return res.status(400).json({ error: 'Item not found' });

            const isFull = Number.parseFloat(typeof full === 'string' ? full : '');
            const simplified = isFull !== 1;

            const userId = savedItem.user || (savedItem.uri.startsWith('ytmusic:liked:') ? savedItem.uri.slice('ytmusic:liked:'.length) : undefined);
            const token = userId ? getDecryptedYouTubeMusicTokens(userId) : undefined;
            const user = userId ? getYouTubeMusicUser(userId) : undefined;

            const data = await resolveYouTubeMusicData({
                source: savedItem.uri,
                simplified,
                token,
                user_id: userId,
                user_name: user?.user.name
            });

            return res.json(data);
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music item", err);
    },
});
