import { getStorageDir } from '@youtube-to-plex/shared-utils/utils/getStorageDir';
import { SyncLogCollection } from "@youtube-to-plex/shared-types/common/sync";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function saveNestedSyncLogs(logs: SyncLogCollection) {
    const logsPath = join(getStorageDir(), 'sync_log.json');
    writeFileSync(logsPath, JSON.stringify(logs, undefined, 4));
}
