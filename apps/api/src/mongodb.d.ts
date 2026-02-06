declare module "mongodb" {
  export interface Document extends Record<string, unknown> {}

  export class ObjectId {
    constructor(id?: string);
    toHexString(): string;
    static isValid(id: string): boolean;
  }

  export interface Collection<T extends Document = Document> {
    findOne(filter: Partial<T>): Promise<T | null>;
    insertOne(doc: T): Promise<{ insertedId: ObjectId }>;
    createIndex(index: Record<string, number>, options?: { unique?: boolean }): Promise<string>;
  }

  export interface Db {
    collection<T extends Document = Document>(name: string): Collection<T>;
  }

  export class MongoClient {
    constructor(url: string);
    connect(): Promise<MongoClient>;
    db(name: string): Db;
  }
}
