import { Box, Card, CardContent, Divider, Typography } from "@mui/material"
import { NextPage } from "next"
import MusicSearchConfigLayout from "@/components/layouts/MusicSearchConfigLayout"
import ProcessingStep from "@/components/MusicSearchConfig/ProcessingStep"

const MusicSearchConfigIndexPage: NextPage = () => {
    return (
        <MusicSearchConfigLayout activeTab="how-it-works">
            <Card>
                <CardContent>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom fontWeight="bold">
                            System Overview
                        </Typography>
                        <Typography variant="body1">
                            The Music Search Configuration system matches tracks from your YouTube Music playlists and library items to tracks in your Plex media library. Metadata often differs between YouTube Music and Plex, so these settings control how aggressively the app normalizes text and searches for the best match.
                        </Typography>

                        <Divider sx={{ my: 4 }} />

                        <Typography variant="h5" gutterBottom fontWeight="bold">
                            Processing Flow
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: { xs: 'stretch', md: 'center' },
                                justifyContent: 'center',
                                my: 4,
                                gap: { xs: 1, md: 0 },
                            }}>
                            <ProcessingStep title="Source Track" description="YouTube Music metadata" />
                            <ProcessingStep title="Text Processing" description="Clean & normalize" />
                            <ProcessingStep title="Search Approaches" description="Multiple strategies" />
                            <ProcessingStep title="Match Filters" description="Quality scoring" />
                            <ProcessingStep title="Plex Match" description="Final result" isLast />
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        <Typography variant="h5" gutterBottom fontWeight="bold">
                            System Components
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                        Text Processing
                                    </Typography>
                                    <Typography variant="body2" pb={1}>
                                        Cleans and normalizes track metadata by removing special characters and other content (like &quot;Remaster&quot; and &quot;Deluxe Edition&quot;), then standardizing text formatting.
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Examples:</strong> &quot;Song (Remaster)&quot; to &quot;song&quot;,
                                        &quot;Track - 2023 Mix&quot; to &quot;track&quot;
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card elevation={2}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                        Search Approaches
                                    </Typography>
                                    <Typography variant="body2" pb={1}>
                                        Apply different search approaches to find matches.
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Strategies:</strong> Exact match, filtered, trimmed, filtered and trimmed
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card elevation={2}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" color="primary">
                                        Match Filters
                                    </Typography>
                                    <Typography variant="body2" pb={1}>
                                        Applies quality filters to rank potential matches based on matching songs, artists, and albums.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>

                    </Box>
                </CardContent>
            </Card>
        </MusicSearchConfigLayout>
    )
}

export default MusicSearchConfigIndexPage
