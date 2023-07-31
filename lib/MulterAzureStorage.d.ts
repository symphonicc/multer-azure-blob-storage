import { Request } from "express";
import { StorageEngine } from "multer";
export declare type MetadataObj = {
    [k: string]: string;
};
export declare type MASNameResolver = (req: Request, file: Express.Multer.File) => Promise<string>;
export declare type MASObjectResolver = (req: Request, file: Express.Multer.File) => Promise<Object>;
export interface IMASOptions {
    authenticationType?: 'azure ad' | 'sas token' | 'connection string' | 'account name and key' | undefined | null;
    sasToken?: string;
    accessKey?: string;
    accountName?: string;
    connectionString?: string;
    urlExpirationTime?: number;
    blobName?: MASNameResolver;
    containerName: MASNameResolver | string;
    metadata?: MASObjectResolver | MetadataObj;
    contentSettings?: MASObjectResolver | MetadataObj;
    containerAccessLevel?: 'container' | 'blob' | 'private';
}
export interface MulterOutFile extends Express.Multer.File {
    url: string;
    etag: string;
    metadata: any;
    blobName: string;
    blobType: string;
    blobSize: string;
    container: string;
}
export declare class MASError implements Error {
    name: string;
    message: string;
    errorList: any[];
    constructor(message?: string);
}
export declare class MulterAzureStorage implements StorageEngine {
    private readonly DEFAULT_UPLOAD_CONTAINER;
    private _error;
    private _blobServiceClient;
    private _blobName;
    private _urlExpirationTime;
    private _metadata;
    private _contentSettings;
    private _containerName;
    private _containerAccessLevel;
    constructor(options: IMASOptions);
    _handleFile(req: Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<MulterOutFile>) => void): Promise<void>;
    _removeFile(req: Request, file: MulterOutFile, callback: (error: Error) => void): Promise<void>;
    /** Helpers */
    private _createContainerIfNotExists;
    private _generateBlobName;
    private _promisifyStaticValue;
    private _promisifyStaticObj;
}
export default MulterAzureStorage;
