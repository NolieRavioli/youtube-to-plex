import { generateError } from '@/helpers/errors/generateError';
import { getDecryptedYouTubeMusicTokens, getYouTubeMusicUser } from '@youtube-to-plex/shared-utils/youtube-music/credentials';
import { listYouTubeMusicLibraryAlbums, listYouTubeMusicLibraryPlaylists, listYouTubeMusicLikedSongs } from '@youtube-to-plex/shared-utils/youtube-music/service';
import { getYouTubeMusicSavedItemsPath } from '@youtube-to-plex/shared-utils/youtube-music/storage';
import { GetYouTubeMusicAlbum } from '@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicAlbum';
import { GetYouTubeMusicPlaylist } from '@youtube-to-plex/shared-types/youtube-music/GetYouTubeMusicPlaylist';
import { SavedItem } from '@youtube-to-plex/shared-types/youtube-music/SavedItem';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { existsSync, readFileSync } from 'node:fs';

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            const { id, type } = req.query;
            if (typeof id !== 'string')
                throw new Error('User ID expected.');

            if (type !== 'albums' && type !== 'playlists' && type !== 'liked')
                throw new Error('Type should be albums, playlists, or liked.');

            const token = getDecryptedYouTubeMusicTokens(id);
            const user = getYouTubeMusicUser(id);
            if (!token || !user)
                throw new Error('User not found.');

            const savedItemsPath = getYouTubeMusicSavedItemsPath();
            let savedItems: SavedItem[] = [];
            if (existsSync(savedItemsPath))
                savedItems = JSON.parse(readFileSync(savedItemsPath, 'utf8'));

            if (type === 'albums') {
                const albums = await listYouTubeMusicLibraryAlbums({ token, user_id: id });
                const response: GetYouTubeMusicAlbum[] = albums.map(item => ({
                    ...item,
                    added: savedItems.some(savedItem => savedItem.id === item.id)
                }));

                return res.json(response);
            }

            if (type === 'liked') {
                const liked = await listYouTubeMusicLikedSongs({
                    token,
                    user_id: id
                });

                const response: GetYouTubeMusicPlaylist[] = liked.map(item => ({
                    ...item,
                    owner: user.user.name,
                    added: savedItems.some(savedItem => savedItem.id === item.id)
                }));

                return res.json(response);
            }

            const playlists = await listYouTubeMusicLibraryPlaylists({ token, user_id: id });
            const response: GetYouTubeMusicPlaylist[] = playlists.map(item => ({
                ...item,
                user_id: id,
                private: true,
                added: savedItems.some(savedItem => savedItem.id === item.id)
            }));

            return res.json(response);
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music library items", err);
    },
});
