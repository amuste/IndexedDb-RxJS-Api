import { NgModule } from '@angular/core';

import { IndexedDbRxApiService } from './indexedDb-rx-api.service';

import { INDEXEDDB_TOKEN } from './../indexeddb.service';

export function indexedDbFactory(): IDBFactory {
    return typeof window !== 'undefined' ? window.indexedDB : null;
}

@NgModule({
    providers: [
        IndexedDbRxApiService,
        { provide: INDEXEDDB_TOKEN, useFactory: indexedDbFactory }
    ],
})

export class IndexedDbRxApiModule { }
