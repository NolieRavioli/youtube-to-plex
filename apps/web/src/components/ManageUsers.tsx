import { errorBoundary } from "@/helpers/errors/errorBoundary";
import { GetYouTubeMusicUserResponse } from "@/pages/api/youtube-music/users";
import { Album, Close, Favorite, QueueMusic } from "@mui/icons-material";
import { Box, Button, CircularProgress, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import axios from "axios";
import { enqueueSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import UserItems from "./UserItems";

export default function ManageUsers() {

    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<GetYouTubeMusicUserResponse[]>([])

    useEffect(() => {
        errorBoundary(async () => {
            const result = await axios.get<GetYouTubeMusicUserResponse[]>(`/api/youtube-music/users`)
            setUsers(result.data)
            setLoading(false)
        }, () => {
            setLoading(false)
        }, true)
    }, [])

    const onDeleteUserClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const { id } = e.currentTarget.dataset;
        if (id) {
            errorBoundary(async () => {
                const result = await axios.delete<GetYouTubeMusicUserResponse[]>(`/api/youtube-music/users?id=${id}`)
                setUsers(result.data)
                enqueueSnackbar(`User removed`)
            })
        }

    }, [])

    /////////////////////////////
    // Set User
    /////////////////////////////
    const [userItems, setUserItems] = useState<{ user: GetYouTubeMusicUserResponse, type: "albums" | "playlists" | "liked" } | null>(null)
    const onItemsUserClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const { id, type } = e.currentTarget.dataset;
        if (id && (type === "albums" || type === "playlists" || type === "liked")) {
            const user = users.find(item => item.id === id)
            if (user)
                setUserItems({ user, type: type as "albums" | "playlists" | "liked" })
        }
    }, [users])

    const onUserItemsClose = useCallback(() => {
        setUserItems(null)
    }, [])

    return (<>
        {loading ?
            <Box sx={{ textAlign: 'center', p: 2 }}><CircularProgress /></Box>
            :
            <>
                <Typography sx={{ mb: 0.5 }} variant="body1">
                    Connect a Google account with YouTube Music access, then import playlists, albums, and liked songs from that library.
                </Typography>
                {users.length > 0 ?
                    <>
                        <Typography variant="h6" sx={{ mt: 2, mb: 0.5 }}>
                            Connected YouTube Music users
                        </Typography>
                        {users.map(item => {

                            return <Paper variant="outlined" key={item.id} sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box>
                                        <Typography variant="body1">{item.name}</Typography>
                                        {!!item.email && <Typography variant="body2" color="text.secondary">{item.email}</Typography>}
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                                    <Tooltip title="Select albums to import" ><IconButton data-id={item.id} data-type="albums" onClick={onItemsUserClick} size="small" ><Album sx={{ fontSize: '1em' }} /></IconButton></Tooltip>
                                    <Tooltip title="Select playlists to import" ><IconButton data-id={item.id} data-type="playlists" onClick={onItemsUserClick} size="small" ><QueueMusic sx={{ fontSize: '1em' }} /></IconButton></Tooltip>
                                    <Tooltip title="Add liked songs" ><IconButton data-id={item.id} data-type="liked" onClick={onItemsUserClick} size="small" ><Favorite sx={{ fontSize: '1em' }} /></IconButton></Tooltip>
                                    <Tooltip title="Delete user"><IconButton data-id={item.id} onClick={onDeleteUserClick} color="error" size="small" ><Close sx={{ fontSize: '1em' }} /></IconButton></Tooltip>
                                </Box>
                            </Paper>
                        })}
                        <Box pt={1}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                You can connect more than one YouTube Music account. Google may reuse your last session, so use an incognito window if you need to connect a different account.
                            </Typography>
                            <Button size="small" variant="outlined" component="a" href="/api/youtube-music/login" sx={{ borderColor: "#ff0033", color: "#ff0033" }}>Add another user</Button>
                        </Box>
                    </>
                    :
                    <Button component="a" href="/api/youtube-music/login" size="small" variant="contained" sx={{ bgcolor: "#ff0033", mt: 1, '&:hover': { bgcolor: "#d9002c" } }}>
                        Connect YouTube Music Account
                    </Button>
                }


            </>
        }
        {!!userItems && <UserItems user={userItems.user} type={userItems.type} onClose={onUserItemsClose} />}
    </>
    )
}
