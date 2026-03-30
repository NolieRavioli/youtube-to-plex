import { generateError } from '@/helpers/errors/generateError';
import { readYouTubeMusicUsers, writeYouTubeMusicUsers } from '@youtube-to-plex/shared-utils/youtube-music/credentials';
import { YouTubeMusicUser } from '@youtube-to-plex/shared-types/youtube-music/YouTubeMusicUser';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';

export type GetYouTubeMusicUserResponse = YouTubeMusicUser

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (_req, res) => {
            const users = readYouTubeMusicUsers();
            if (users.length === 0)
                return res.status(400).json({ error: "No users are currently connected." });

            return res.status(200).json(users.map(item => item.user));
        }
    )
    .put(
        async (req, res) => {
            const users = readYouTubeMusicUsers();
            if (users.length === 0)
                return res.status(400).json({ error: "No users are currently connected." });

            const { id, sync, label, history_sync } = req.body;
            const credential = users.find(item => item.user.id === id);
            if (!credential)
                return res.status(404).json({ error: "User not found." });

            if (typeof sync === 'boolean')
                credential.user.sync = sync;

            if (typeof label === 'string')
                credential.user.label = label;

            if (typeof history_sync === 'boolean')
                credential.user.historySync = history_sync;

            writeYouTubeMusicUsers(users);
            return res.status(200).json(users.map(item => item.user));
        }
    )
    .delete(
        async (req, res) => {
            const users = readYouTubeMusicUsers();
            if (users.length === 0)
                return res.status(400).json({ error: "No users are currently connected." });

            const { id } = req.query;
            if (typeof id !== 'string')
                return res.status(400).json({ error: "ID expected but none found" });

            if (!users.some(item => item.user.id === id))
                return res.status(400).json({ error: "User not found" });

            const updatedUsers = users.filter(item => item.user.id !== id);
            writeYouTubeMusicUsers(updatedUsers);
            return res.status(200).json(updatedUsers.map(item => item.user));
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music users", err);
    },
});
