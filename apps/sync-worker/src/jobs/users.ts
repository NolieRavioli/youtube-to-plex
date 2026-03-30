import { clearSyncTypeLogs } from "../utils/clearSyncTypeLogs";
import { completeSyncType } from "../utils/completeSyncType";
import { errorSyncType } from "../utils/errorSyncType";
import { startSyncType } from "../utils/startSyncType";

export async function syncUsers() {
    startSyncType('users');
    clearSyncTypeLogs('users');

    try {
        console.log('User history auto-discovery is disabled for the YouTube Music provider.');
        completeSyncType('users');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errorSyncType('users', message);
        throw error;
    }
}

function run() {
    console.log('Start syncing users');
    syncUsers()
        .then(() => {
            console.log('Sync complete');
        })
        .catch((error: unknown) => {
            console.log(error);
        });
}

// eslint-disable-next-line unicorn/prefer-module
if (require.main === module) {
    run();
}
