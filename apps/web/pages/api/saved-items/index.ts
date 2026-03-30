/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { generateError } from '@/helpers/errors/generateError';
import { getById } from '@youtube-to-plex/plex-music-search/functions/getById';
import { getMusicSearchConfig } from "@youtube-to-plex/music-search/functions/getMusicSearchConfig";
import { getSettings } from '@youtube-to-plex/plex-config/functions/getSettings';
import { getDecryptedYouTubeMusicTokens, readYouTubeMusicUsers } from '@youtube-to-plex/shared-utils/youtube-music/credentials';
import { resolveYouTubeMusicData } from '@youtube-to-plex/shared-utils/youtube-music/service';
import { getYouTubeMusicSavedItemsPath } from '@youtube-to-plex/shared-utils/youtube-music/storage';
import type { SavedItem } from '@youtube-to-plex/shared-types/youtube-music/SavedItem';
import type { YouTubeMusicCredentials } from '@youtube-to-plex/shared-types/youtube-music/YouTubeMusicCredentials';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readSavedItems() {
    const savedItemsPath = getYouTubeMusicSavedItemsPath();
    if (!existsSync(savedItemsPath))
        return [] as SavedItem[];

    return JSON.parse(readFileSync(savedItemsPath, 'utf8')) as SavedItem[];
}

function writeSavedItems(items: SavedItem[]) {
    writeFileSync(getYouTubeMusicSavedItemsPath(), JSON.stringify(items, undefined, 4));
}

function findUserByIdentifier(users: YouTubeMusicCredentials[], identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    return users.find(credential => {
        const { name, email } = credential.user;
        return name.toLowerCase() === normalized || email?.toLowerCase() === normalized;
    });
}

function normalizeSource(type: SavedItem['type'], id: string, userId?: string) {
    switch (type) {
        case 'youtube-music-album':
            return `ytmusic:album:${id}`;
        case 'youtube-music-liked':
            return `ytmusic:liked:${userId || id.replace(/^liked-/, '')}`;
        default:
            return `ytmusic:playlist:${id}`;
    }
}

const router = createRouter<NextApiRequest, NextApiResponse>()
    .get(
        async (req, res) => {
            const savedItems = readSavedItems();
            const { id } = req.query;
            if (typeof id === 'string') {
                const savedItem = savedItems.find(item => item.id === id);
                if (!savedItem)
                    throw new Error(`Saved item not found ${id}`);

                return res.status(200).json([savedItem]);
            }

            return res.status(200).json(savedItems.reverse());
        }
    )
    .post(
        async (req, res) => {
            try {
                const { search, user_id, label } = req.body;
                if (typeof search !== 'string')
                    return res.status(400).json({ error: "Search query missing" });

                const trimmedSearch = search.trim();
                let savedItem: SavedItem | null = null;

                if (trimmedSearch.startsWith('/library')) {
                    const plexMediaId = trimmedSearch;
                    const settings = await getSettings();
                    if (!settings.token || !settings.uri)
                        return res.status(400).json({ msg: "Plex not configured" });

                    const musicSearchConfig = await getMusicSearchConfig();
                    const plexConfig = {
                        uri: settings.uri,
                        token: settings.token,
                        musicSearchConfig
                    };

                    const metaData = await getById(plexConfig, plexMediaId);
                    if (metaData) {
                        savedItem = {
                            type: 'plex-media',
                            uri: metaData.id,
                            id: metaData.guid,
                            title: metaData.title,
                            image: `/api/plex/image?path=${encodeURIComponent(metaData.image)}`
                        };
                    }
                } else if (trimmedSearch === 'liked' || trimmedSearch === 'liked-songs' || trimmedSearch.endsWith(':liked') || trimmedSearch.startsWith('ytmusic:liked:')) {
                    const users = readYouTubeMusicUsers();
                    if (users.length === 0)
                        return res.status(400).json({ error: "No YouTube Music users are connected. Connect a user first to add liked songs." });

                    let matchedUser: YouTubeMusicCredentials | undefined;
                    if (typeof user_id === 'string')
                        matchedUser = users.find(item => item.user.id === user_id);

                    if (!matchedUser && trimmedSearch.startsWith('ytmusic:liked:')) {
                        const internalUserId = trimmedSearch.slice('ytmusic:liked:'.length).trim();
                        matchedUser = users.find(item => item.user.id === internalUserId);
                    }

                    if (!matchedUser && trimmedSearch.endsWith(':liked')) {
                        const identifier = trimmedSearch.slice(0, -':liked'.length);
                        matchedUser = findUserByIdentifier(users, identifier);
                    }

                    if (!matchedUser && (trimmedSearch === 'liked' || trimmedSearch === 'liked-songs')) {
                        if (users.length !== 1)
                            return res.status(400).json({ error: "Multiple users are connected. Select liked songs from the Users page or specify {email}:liked." });

                        matchedUser = users[0];
                    }

                    if (!matchedUser)
                        return res.status(400).json({ error: "Connected YouTube Music user not found for liked songs import." });

                    savedItem = {
                        type: 'youtube-music-liked',
                        uri: `ytmusic:liked:${matchedUser.user.id}`,
                        id: `liked-${matchedUser.user.id}`,
                        title: 'Liked Songs',
                        image: matchedUser.user.picture || '',
                        user: matchedUser.user.id
                    };
                } else {
                    const token = typeof user_id === 'string' ? getDecryptedYouTubeMusicTokens(user_id) : undefined;
                    const user = typeof user_id === 'string'
                        ? readYouTubeMusicUsers().find(item => item.user.id === user_id)
                        : undefined;

                    const data = await resolveYouTubeMusicData({
                        source: trimmedSearch,
                        simplified: true,
                        token,
                        user_id,
                        user_name: user?.user.name
                    });

                    savedItem = {
                        type: data.type as SavedItem['type'],
                        uri: normalizeSource(data.type as SavedItem['type'], data.id, user_id),
                        id: data.id,
                        title: data.title,
                        image: data.image
                    };

                    if (typeof user_id === 'string')
                        savedItem.user = user_id;
                }

                if (!savedItem)
                    return res.status(400).json({ error: "Could not find data to save" });

                if (typeof label === 'string')
                    savedItem.label = label;

                const savedItems = readSavedItems();
                if (savedItems.some(item => item.id === savedItem.id))
                    return res.status(400).json({ error: `${savedItem.title} (id: ${savedItem.id}) is already added.` });

                savedItems.push(savedItem);
                writeSavedItems(savedItems);

                return res.status(200).json(savedItems.reverse());
            } catch (error: any) {
                const message = error.message || 'Failed to save items';
                return res.status(500).json({ error: message });
            }
        }
    )
    .delete(
        async (req, res) => {
            const savedItems = readSavedItems();
            if (savedItems.length === 0)
                return res.status(400).json({ error: 'No items found' });

            const { id } = req.query;
            if (typeof id !== 'string')
                return res.status(400).json({ error: 'ID expected but none found' });

            if (!savedItems.some(item => item.id === id))
                return res.status(400).json({ error: 'Item not found' });

            const updatedItems = savedItems.filter(item => item.id !== id);
            writeSavedItems(updatedItems);
            return res.status(200).json(updatedItems.reverse());
        }
    )
    .put(
        async (req, res) => {
            const savedItems = readSavedItems();
            if (savedItems.length === 0)
                return res.status(400).json({ error: 'No items found' });

            const { ids, label, sync, sync_interval, title } = req.body;
            if (!Array.isArray(ids))
                return res.status(400).json({ error: 'Multiple ids expected as an array' });

            for (let i = 0; i < ids.length; i++) {
                const savedItem = savedItems.find(item => item.id === ids[i]);
                if (!savedItem)
                    return res.status(400).json({ error: 'Item not found' });

                if (typeof sync === 'boolean' && typeof sync_interval === 'string') {
                    savedItem.sync = sync;
                    savedItem.sync_interval = sync_interval;
                }

                if (typeof label === 'string')
                    savedItem.label = label;

                if (typeof title === 'string')
                    savedItem.title = title;
            }

            writeSavedItems(savedItems);
            return res.status(200).json(savedItems.reverse());
        }
    );

export default router.handler({
    onError: (err: unknown, req: NextApiRequest, res: NextApiResponse) => {
        generateError(req, res, "Saved items", err);
    },
});
