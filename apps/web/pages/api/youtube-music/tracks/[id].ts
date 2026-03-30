import { generateError } from '@/helpers/errors/generateError';
import { getYouTubeMusicTrack } from '@youtube-to-plex/shared-utils/youtube-music/service';
import { Track } from '@youtube-to-plex/shared-types/youtube-music/Track';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';

export type GetYouTubeMusicTrackByIdResponse = Track

function extractVideoId(input: string) {
    if (input.startsWith('ytmusic:track:'))
        return input.slice('ytmusic:track:'.length);

    try {
        const url = new URL(input);
        const videoId = url.searchParams.get('v');
        if (videoId)
            return videoId;

        if (url.hostname === 'youtu.be')
            return url.pathname.replace(/^\/+/, '');
    } catch {
    }

    return input;
}

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            const { id } = req.query;
            if (typeof id !== 'string')
                return res.status(400).json({ error: 'Track ID missing' });

            const track = await getYouTubeMusicTrack(extractVideoId(id));
            return res.status(200).json(track);
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "YouTube Music track", err);
    },
});
