import Logo from "@/components/Logo";
import ManageUsers from "@/components/ManageUsers";
import MusicNavigation from "@/components/MusicNavigation";
import MainLayout from "@/layouts/MainLayout";
import { Container, Paper, Typography } from '@mui/material';
import { NextPage } from "next";
import Head from "next/head";

const Page: NextPage = () => {
    return (
        <>
            <Head>
                <title>
                    Manage Users - YouTube Music to Plex
                </title>
            </Head>
            <MainLayout maxWidth="700px">
                <Container>
                    <Logo  />
                    <MusicNavigation  />
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="h4" sx={{ mt: 2, mb: 0.5 }}>Manage Users</Typography>
                        <Typography variant="body1" sx={{ mb: 1, maxWidth: 500 }}>
                            Manage connected YouTube Music users and import from their libraries.
                        </Typography>
                        <ManageUsers  />
                    </Paper>
                </Container>
            </MainLayout>
        </>
    );
};

export default Page; 
