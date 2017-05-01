export class IndexedDbMessages {

    public static readonly DB_OPEN = 'DB_OPEN';
    public static readonly DB_ALREADY_OPEN = 'DB_ALREADY_OPEN';
    public static readonly DB_OPEN_AND_UPGRADED = 'DB_OPEN_AND_UPGRADED';
    public static readonly DB_OPEN_ERROR = 'DB_OPEN_ERROR';
    public static readonly DB_DELETED = 'DB_DELETED';
    public static readonly DB_DELETED_ERROR = 'DB_DELETED_ERROR';
    public static readonly DB_DATA_ADDED = 'DB_DATA_ADDED';
    public static readonly DB_DATA_ADD_ERROR = 'DB_DATA_ADD_ERROR';
    public static readonly DB_CLOSE = 'DB_CLOSE';
    public static readonly DB_TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR';
    public static readonly DB_GETBYKEY_ERROR = 'DB_GETBYKEY_ERROR';
    public static readonly DB_DELETEOBJECT_ERROR = 'DB_DELETEOBJECT_ERROR';
    public static readonly DB_DELETEOBJECT_SUCCESS = 'DB_DELETEOBJECT_SUCCESS';

    public static getDescription(Code: string): string {
        const INPUT_MESSAGES = {
            DB_OPEN: 'Database Open',
            DB_ALREADY_OPEN: 'Database Already Open',
            DB_OPEN_AND_UPGRADED: 'Database Open and Upgraded',
            DB_OPEN_ERROR: 'Error opening Database',
            DB_DELETED: 'Database Deleted',
            DB_DELETED_ERROR: 'Error deleting Database',
            DB_DATA_ADDED: 'Records have been add sucessfully',
            DB_DATA_ADD_ERROR: 'Error Adding Data',
            DB_CLOSE: 'Database is close',
            DB_TRANSACTION_ERROR: 'Error opening a transaction',
            DB_GETBYKEY_ERROR: 'Error getting object',
            DB_DELETEOBJECT_ERROR: 'Error deleting object',
            DB_DELETEOBJECT_SUCCESS: 'Object deleted'
        };

        return INPUT_MESSAGES[Code];
    };

}