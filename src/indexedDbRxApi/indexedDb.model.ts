export interface IndexedDbDatabaseModel {
    name: string;
    version: number;
    stores: Array<IndexedDbStores>;
    instance: IDBDatabase;
}

export interface IndexedDbStores {
    name: string;
    key: {};
    indexes: Array<IndexedDbIndexes>;
}

export interface IndexedDbIndexes {
    name: string;
    definition: {};
}

