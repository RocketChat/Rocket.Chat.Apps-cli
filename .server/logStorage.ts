import { AppConsole, ILoggerStorageEntry } from '@rocket.chat/apps-engine/server/logging';
import { AppLogStorage, IAppLogStorageFindOptions, IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';

import * as Datastore from 'nedb';

export class ServerAppLogStorage extends AppLogStorage {
    private db: Datastore;

    constructor() {
        super('nedb');
        this.db = new Datastore({ filename: '.server-data/app-logs.nedb', autoload: true });
    }

    public find(query: { [field: string]: any; },
                options?: IAppLogStorageFindOptions): Promise<Array<ILoggerStorageEntry>> {
        throw new Error('Method not implemented.');
    }

    public storeEntries(appId: string, logger: AppConsole): Promise<ILoggerStorageEntry> {
        return new Promise((resolve, reject) => {
            const item = AppConsole.toStorageEntry(appId, logger);

            this.db.insert(item, (err: Error, doc: ILoggerStorageEntry) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        });
    }

    public getEntriesFor(appId: string): Promise<Array<ILoggerStorageEntry>> {
        throw new Error('Method not implemented.');
    }
}
