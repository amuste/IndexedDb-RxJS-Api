import { IndexedDbDatabaseModel, IndexedDbStores, IndexedDbIndexes } from './../infrastructure/services/indexedDbRxApi/indexedDb.model';

export class SecurityDb implements IndexedDbDatabaseModel {

    name = 'SecurityDb';
    version = 1;
    stores = [
        {
            name: 'users',
            key: { keyPath: 'rowId', autoIncrement: true },
            indexes: [
                {
                    name: 'rowId',
                    definition: { unique: true }
                },
                {
                    name: 'name',
                    definition: { unique: false }
                },
                {
                    name: 'lastName',
                    definition: { unique: false }
                },
                {
                    name: 'userId',
                    definition: { unique: true }
                }
            ]
        },
        {
            name: 'rights',
            key: { keyPath: 'rightId' },
            indexes: [
                {
                    name: 'name',
                    definition: { unique: false }
                }
            ]
        }
    ];
    instance: IDBDatabase = null;
}

