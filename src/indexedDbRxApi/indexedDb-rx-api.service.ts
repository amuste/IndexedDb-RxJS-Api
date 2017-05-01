import { Injectable, Inject } from '@angular/core';

import { IndexedDbDatabaseModel, IndexedDbStores, IndexedDbIndexes } from './indexedDb.model';

import { IndexedDbMessages } from './indexedDb-messages.constant';

import { INDEXEDDB_TOKEN } from './../indexeddb.service';

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';

export interface IIndexedDbRxApiService {
  open(dbModel: IndexedDbDatabaseModel): Observable<string>;
  delete(dbModel: IndexedDbDatabaseModel): Observable<any>;
  add(dbModel: IndexedDbDatabaseModel, objectStoreName: string, data: any[]): Observable<any>;
  getAll(dbModel: IndexedDbDatabaseModel, objectStoreName: string): Observable<any>;
  getRange(dbModel: IndexedDbDatabaseModel, objectStoreName: string, lowerBound: number | string, upperBound: number | string): Observable<any>;
  getObjectsByIndex(dbModel: IndexedDbDatabaseModel, objectStoreName: string, lowerBound: number | string, upperBound: number | string,
    dbIndex: string, isRange: boolean): Observable<any>;
  deleteAll(dbModel: IndexedDbDatabaseModel, objectStoreName: string): Observable<any>;
  getByKey(dbModel: IndexedDbDatabaseModel, objectStoreName: string, key: number | string): Observable<any>;
  deleteByKey(dbModel: IndexedDbDatabaseModel, objectStoreName: string, key: string): Observable<any>;
}

@Injectable()
export class IndexedDbRxApiService implements IIndexedDbRxApiService {

  private indexedDb: IDBFactory;
  private transactionTypes = {
    'readonly': 'readonly',
    'readwrite': 'readwrite'
  };
  private eventTypes = {
    'success': 'success',
    'error': 'error',
    'complete': 'complete',
    'upgradeneeded': 'upgradeneeded'
  };

  constructor(
    @Inject(INDEXEDDB_TOKEN) indexedDb: IDBFactory
  ) {
    this.indexedDb = indexedDb;
  }

  open(dbModel: IndexedDbDatabaseModel): Observable<string> {

    let isUpgradeneeded = false;

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance !== null) {

        observer.next(IndexedDbMessages.DB_ALREADY_OPEN);
        observer.complete();

      } else {

        const openRequest: IDBOpenDBRequest = this.indexedDb.open(dbModel.name, dbModel.version);

        const onSuccess = (event: any) => {
          dbModel.instance = event.target.result;
          isUpgradeneeded ? observer.next(IndexedDbMessages.DB_OPEN_AND_UPGRADED) : observer.next(IndexedDbMessages.DB_OPEN);
          observer.complete();
        };

        const onError = (err: any) => {
          observer.error(IndexedDbMessages.DB_OPEN_ERROR);
        };

        const onUpgradeneeded = (event: any) => {
          let newDbVersion: IDBDatabase = event.target.result;
          let storeModel: IndexedDbStores[] = dbModel.stores;
          isUpgradeneeded = true;
          this.upgradeDb(newDbVersion, storeModel);
        };

        openRequest.addEventListener(this.eventTypes.success, onSuccess);
        openRequest.addEventListener(this.eventTypes.error, onError);
        openRequest.addEventListener(this.eventTypes.upgradeneeded, onUpgradeneeded);

        return () => {
          openRequest.removeEventListener(this.eventTypes.success, onSuccess);
          openRequest.removeEventListener(this.eventTypes.error, onError);
          openRequest.removeEventListener(this.eventTypes.upgradeneeded, onUpgradeneeded);
        };

      }
    });
  }

  private upgradeDb(newDbVersion: IDBDatabase, stores: IndexedDbStores[]): void {
    let objectStore: IDBObjectStore;

    for (let store of stores) {
      if (!newDbVersion.objectStoreNames.contains(store.name)) {
        objectStore = newDbVersion.createObjectStore(store.name, store.key);

        for (let index of store.indexes) {
          objectStore.createIndex(index.name, index.name, index.definition);
        }
      }
    }
  }

  delete(dbModel: IndexedDbDatabaseModel): Observable<any> {

    return Observable.create((observer: Observer<any>) => {

      if (dbModel.instance !== null) {
        dbModel.instance.close();
      }

      const deleteRequest = this.indexedDb.deleteDatabase(dbModel.name);

      const onSuccess = (event: any) => {
        dbModel.instance = null;
        observer.next(IndexedDbMessages.DB_DELETED);
        observer.complete();
      };

      const onError = (err: any) => {
        observer.error(IndexedDbMessages.DB_DELETED_ERROR);
      };

      deleteRequest.addEventListener(this.eventTypes.success, onSuccess);
      deleteRequest.addEventListener(this.eventTypes.error, onError);

      return () => {
        deleteRequest.removeEventListener(this.eventTypes.success, onSuccess);
        deleteRequest.removeEventListener(this.eventTypes.error, onError);
      };

    });
  }

  add(dbModel: IndexedDbDatabaseModel, objectStoreName: string, data: any[]): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {

        observer.error(IndexedDbMessages.DB_CLOSE);

      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readwrite);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const onComplete = (event: any) => {
          observer.next(IndexedDbMessages.DB_DATA_ADDED);
          observer.complete();
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        const add = (item: any): Observable<any> => {
          return new Observable((addReqObserver: Observer<any>) => {

            const addRequest: IDBRequest = objectStore.add(item);

            const onRequestError = (error: any) => {
              addReqObserver.error(IndexedDbMessages.DB_DATA_ADD_ERROR);
            };

            const onSuccess = (event: any) => {
              addReqObserver.next(event);
              addReqObserver.complete();
            };

            addRequest.addEventListener(this.eventTypes.success, onSuccess);
            addRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              addRequest.removeEventListener(this.eventTypes.success, onSuccess);
              addRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.error, onTransactionError);
        transaction.addEventListener(this.eventTypes.complete, onComplete);

        const addRequestSubscriber = Observable.from(data).flatMap((item) => {
          return add(item);
        }).subscribe(() => { }, (error) => { observer.error(error); });

        return () => {
          transaction.removeEventListener(this.eventTypes.complete, onComplete);
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
          addRequestSubscriber.unsubscribe();
        };

      }
    });
  }

  getByKey(dbModel: IndexedDbDatabaseModel, objectStoreName: string, key: number | string): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {

        observer.error(IndexedDbMessages.DB_CLOSE);

      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readonly);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        const getByKey = (): Observable<any> => {
          return new Observable((addReqObserver: Observer<any>) => {

            const addRequest: IDBRequest = objectStore.get(key);

            const onRequestError = (error: any) => {
              addReqObserver.error(IndexedDbMessages.DB_GETBYKEY_ERROR);
            };

            const onSuccess = (event: any) => {
              addReqObserver.next(addRequest.result);
              addReqObserver.complete();
            };

            addRequest.addEventListener(this.eventTypes.success, onSuccess);
            addRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              addRequest.removeEventListener(this.eventTypes.success, onSuccess);
              addRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.error, onTransactionError);

        const addRequestSubscriber = getByKey().subscribe((item) => {
          observer.next(item);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          addRequestSubscriber.unsubscribe();
        };

      }
    });
  }

  deleteByKey(dbModel: IndexedDbDatabaseModel, objectStoreName: string, key: string): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {

        observer.error(IndexedDbMessages.DB_CLOSE);

      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readwrite);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        const deleteByKey = (): Observable<any> => {
          return new Observable((deleteReqObserver: Observer<any>) => {

            const deleteRequest: IDBRequest = objectStore.delete(key);

            const onRequestError = (error: any) => {
              deleteReqObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {
              deleteReqObserver.next(IndexedDbMessages.DB_DELETEOBJECT_SUCCESS);
              deleteReqObserver.complete();
            };

            deleteRequest.addEventListener(this.eventTypes.success, onSuccess);
            deleteRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              deleteRequest.removeEventListener(this.eventTypes.success, onSuccess);
              deleteRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.success, onTransactionError);

        const deleteRequestSubscriber = deleteByKey().subscribe((message) => {
          observer.next(message);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          deleteRequestSubscriber.unsubscribe();
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
        };

      }
    });
  }

  deleteAll(dbModel: IndexedDbDatabaseModel, objectStoreName: string): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {

        observer.error(IndexedDbMessages.DB_CLOSE);

      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readwrite);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        const deleteAll = (): Observable<any> => {
          return new Observable((deleteReqObserver: Observer<any>) => {

            const deleteRequest: IDBRequest = objectStore.clear();

            const onRequestError = (error: any) => {
              deleteReqObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {
              deleteReqObserver.next(IndexedDbMessages.DB_DELETEOBJECT_SUCCESS);
              deleteReqObserver.complete();
            };

            deleteRequest.addEventListener(this.eventTypes.success, onSuccess);
            deleteRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              deleteRequest.removeEventListener(this.eventTypes.success, onSuccess);
              deleteRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.success, onTransactionError);

        const deleteRequestSubscriber = deleteAll().subscribe((message) => {
          observer.next(message);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          deleteRequestSubscriber.unsubscribe();
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
        };

      }
    });
  }

  getAll(dbModel: IndexedDbDatabaseModel, objectStoreName: string): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {
        observer.error(IndexedDbMessages.DB_CLOSE);
      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readonly);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        const objectCount = (): Observable<number> => {
          return new Observable((objectCountObserver: Observer<number>) => {

            const objectCountRequest: IDBRequest = objectStore.count();

            const onRequestError = (error: any) => {
              objectCountObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {
              let count: number = event.target.result;
              objectCountObserver.next(count);
              objectCountObserver.complete();
            };

            objectCountRequest.addEventListener(this.eventTypes.success, onSuccess);
            objectCountRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              objectCountRequest.removeEventListener(this.eventTypes.success, onSuccess);
              objectCountRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        let objects: any[] = [];
        const getAll = (count: number): Observable<any> => {
          return new Observable((cursorObserver: Observer<any>) => {

            const cursorRequest: IDBRequest = objectStore.openCursor();

            const onRequestError = (error: any) => {
              cursorObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {

              let result, item;
              result = event.target.result;

              if (result !== null) {

                item = result.value;
                objects.push(item);

                if (objects.length === count) {
                  cursorObserver.next(objects);
                  cursorObserver.complete();
                } else {
                  result.continue();
                }
              } else {
                cursorObserver.next(objects);
                cursorObserver.complete();
              }
            };

            cursorRequest.addEventListener(this.eventTypes.success, onSuccess);
            cursorRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              cursorRequest.removeEventListener(this.eventTypes.success, onSuccess);
              cursorRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.success, onTransactionError);

        const getAllSubscriber = objectCount().flatMap((count: number) => {
          return getAll(count);
        }).subscribe((data) => {
          observer.next(data);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          getAllSubscriber.unsubscribe();
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
        };

      }
    });
  }

  getRange(dbModel: IndexedDbDatabaseModel, objectStoreName: string, lowerBound: number | string, upperBound: number | string): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {
        observer.error(IndexedDbMessages.DB_CLOSE);
      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readonly);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        let objects: any[] = [];
        const getRange = (): Observable<any> => {
          return new Observable((cursorObserver: Observer<any>) => {

            let boundedKeyRange = IDBKeyRange.bound(lowerBound, upperBound, false, false);
            const cursorRequest: IDBRequest = objectStore.openCursor(boundedKeyRange);

            const onRequestError = (error: any) => {
              cursorObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {

              let result, item;
              result = event.target.result;

              if (result !== null) {

                item = result.value;
                objects.push(item);
                result.continue();

              } else {
                cursorObserver.next(objects);
                cursorObserver.complete();
              }
            };

            cursorRequest.addEventListener(this.eventTypes.success, onSuccess);
            cursorRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              cursorRequest.removeEventListener(this.eventTypes.success, onSuccess);
              cursorRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.success, onTransactionError);

        const getRangeSubscriber = getRange().subscribe((data) => {
          observer.next(data);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
          getRangeSubscriber.unsubscribe();
        };

      }
    });
  }

  getObjectsByIndex(dbModel: IndexedDbDatabaseModel, objectStoreName: string, lowerBound: number | string, upperBound: number | string,
    dbIndex: string, isRange: boolean): Observable<any> {

    return Observable.create((observer: Observer<string>) => {

      if (dbModel.instance === null) {
        observer.error(IndexedDbMessages.DB_CLOSE);
      } else {

        const transaction: IDBTransaction = dbModel.instance.transaction([objectStoreName], this.transactionTypes.readonly);

        const onTransactionError = (error: any) => {
          observer.error(IndexedDbMessages.DB_TRANSACTION_ERROR);
        };

        const objectStore: IDBObjectStore = transaction.objectStore(objectStoreName);

        let objects: any[] = [];
        const getRange = (): Observable<any> => {
          return new Observable((cursorObserver: Observer<any>) => {

            let boundedKeyRange: IDBKeyRange;
            isRange = isRange || false;
            if (isRange) {
              boundedKeyRange = IDBKeyRange.bound(lowerBound, upperBound, false, false);
            } else {
              boundedKeyRange = IDBKeyRange.only(lowerBound);
            }

            const index = objectStore.index(dbIndex);
            const cursorRequest: IDBRequest = index.openCursor(boundedKeyRange);

            const onRequestError = (error: any) => {
              cursorObserver.error(IndexedDbMessages.DB_DELETEOBJECT_ERROR);
            };

            const onSuccess = (event: any) => {

              let result, item;
              result = event.target.result;

              if (result !== null) {

                item = result.value;
                objects.push(item);
                result.continue();

              } else {
                cursorObserver.next(objects);
                cursorObserver.complete();
              }
            };

            cursorRequest.addEventListener(this.eventTypes.success, onSuccess);
            cursorRequest.addEventListener(this.eventTypes.error, onRequestError);

            return () => {
              cursorRequest.removeEventListener(this.eventTypes.success, onSuccess);
              cursorRequest.removeEventListener(this.eventTypes.error, onRequestError);
            };

          });
        };

        transaction.addEventListener(this.eventTypes.success, onTransactionError);

        const getRangeSubscriber = getRange().subscribe((data) => {
          observer.next(data);
          observer.complete();
        }, (error) => { observer.error(error); });

        return () => {
          transaction.removeEventListener(this.eventTypes.error, onTransactionError);
          getRangeSubscriber.unsubscribe();
        };

      }
    });
  }

}