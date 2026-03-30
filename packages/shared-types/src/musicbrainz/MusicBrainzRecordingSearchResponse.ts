export type MusicBrainzRecording = {
    id: string;
    score?: number;
    title: string;
    length?: number; // duration in milliseconds
    isrcs?: string[];
    'artist-credit': {
        name?: string;
        artist: {
            id: string;
            name: string;
            'sort-name': string;
        };
    }[];
    releases?: {
        id: string;
        title: string;
        status?: string;
        'release-group'?: {
            id: string;
            'primary-type'?: string;
        };
    }[];
};

export type MusicBrainzRecordingSearchResponse = {
    created: string;
    count: number;
    offset: number;
    recordings: MusicBrainzRecording[];
};
