import { Alert, Box, Button, Card, CardContent, Divider, TextField, Typography } from "@mui/material"
import { NextPage } from "next"
import MusicSearchConfigLayout from "@/components/layouts/MusicSearchConfigLayout"
import TrackAnalyzer from "@/components/TrackAnalyzer"
import { useState, useRef, ElementRef, useEffect, useCallback } from "react"
import { errorBoundary } from "@/helpers/errors/errorBoundary"
import axios from "axios"

const STORAGE_KEY = 'youtube-music-test-track-id';

const TestConfigPage: NextPage = () => {
    const [youtubeMusicId, setYouTubeMusicId] = useState('');

    const trackAnalyzerRef = useRef<ElementRef<typeof TrackAnalyzer>>(null);

    const [loading, setLoading] = useState(true)
    const [canUseTidal, setCanUseTidal] = useState(false)
    const [canUseSlskd, setCanUseSlskd] = useState(false)
    useEffect(() => {

        errorBoundary(async () => {
            // Check Tidal availability
            const tidalValidResult = await axios.get<{ ok: boolean }>('/api/tidal/valid')
            if (tidalValidResult.data.ok) {
                setCanUseTidal(true)
            }

            // Check SLSKD availability
            const slskdValidResult = await axios.get<{ ok: boolean }>('/api/slskd/valid')
            if (slskdValidResult.data.ok) {
                setCanUseSlskd(true)
            }

            setLoading(false)
        }, () => {
            setLoading(false)
        })

    }, [])


    useEffect(() => {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            setYouTubeMusicId(savedId);
        }
    }, []);

    // Save the source track ID to localStorage whenever it changes
    const handleIdChange = (value: string) => {
        setYouTubeMusicId(value);
        if (value.trim()) {
            localStorage.setItem(STORAGE_KEY, value.trim());
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const handleAnalyzePlex = useCallback(() => {
        if (!youtubeMusicId.trim()) return;

        trackAnalyzerRef.current?.analyze(youtubeMusicId.trim(), 'plex');
    }, [youtubeMusicId]);

    const handleAnalyzeTidal = useCallback(() => {
        if (!youtubeMusicId.trim()) return;

        trackAnalyzerRef.current?.analyze(youtubeMusicId.trim(), 'tidal');
    }, [youtubeMusicId]);

    const handleAnalyzeSlskd = useCallback(() => {
        if (!youtubeMusicId.trim()) return;

        trackAnalyzerRef.current?.analyze(youtubeMusicId.trim(), 'slskd');
    }, [youtubeMusicId]);

    const extractYouTubeMusicId = (input: string) => {
        try {
            const url = new URL(input);
            const videoId = url.searchParams.get('v');
            if (videoId)
                return videoId;

            if (url.hostname === 'youtu.be')
                return url.pathname.replace(/^\/+/, '');
        } catch {
        }

        return input.trim();
    };

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        const trackId = extractYouTubeMusicId(value);
        handleIdChange(trackId);
    }, []);

    return (
        <MusicSearchConfigLayout activeTab="test" title="Test Configuration">
            <Card>
                <CardContent>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" sx={{ mb: 3 }}>
                            Track Analysis Testing
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                            Enter a YouTube Music track video ID or URL to analyze how it matches with your Plex library using your current search configuration.
                        </Typography>

                        <TextField fullWidth value={youtubeMusicId} onChange={handleInputChange} placeholder="e.g., dQw4w9WgXcQ or https://music.youtube.com/watch?v=..." />
                        <Box pt={1} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button variant="contained" onClick={handleAnalyzePlex} disabled={!youtubeMusicId.trim()}>
                                Analyze Track in Plex
                            </Button>
                            <Button disabled={!youtubeMusicId.trim() || !canUseTidal} variant="contained" onClick={handleAnalyzeTidal}>
                                Analyze Track in Tidal
                            </Button>
                            <Button disabled={!youtubeMusicId.trim() || !canUseSlskd} variant="contained" onClick={handleAnalyzeSlskd}>
                                Analyze Track in SLSKD
                            </Button>
                        </Box>
                        {!loading && (!canUseTidal || !canUseSlskd) ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                {!canUseTidal && !canUseSlskd ? 'You have not configured Tidal or SLSKD credentials.' : null}
                                {!canUseTidal && canUseSlskd ? 'Tidal credentials not configured.' : null}
                                {canUseTidal && !canUseSlskd ? 'SLSKD credentials not configured.' : null}
                                {' '}Visit the project documentation for configuration instructions.
                            </Alert>
                        ) : null}

                        <Divider sx={{ my: 2 }} />
                        <TrackAnalyzer ref={trackAnalyzerRef} />
                    </Box>
                </CardContent>
            </Card>
        </MusicSearchConfigLayout>
    )
}

export default TestConfigPage
