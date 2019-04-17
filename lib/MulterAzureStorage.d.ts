/// <reference types="node" />
import { Request } from "express";
import { StorageEngine } from "multer";
import { Stream } from "stream";
export declare type MetadataObj = {
    [k: string]: string;
};
export declare type MASNameResolver = (req: Request, file: Express.Multer.File) => Promise<string>;
export declare type MASObjectResolver = (req: Request, file: Express.Multer.File) => Promise<Object>;
export interface IMASOptions {
    accessKey?: string;
    accountName?: string;
    connectionString?: string;
    urlExpirationTime?: number;
    blobName?: MASNameResolver;
    containerName: MASNameResolver | string;
    metadata?: MASObjectResolver | MetadataObj;
    containerAccessLevel?: string;
}
export interface MulterInFile extends Express.Multer.File {
    stream: Stream;
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
    private readonly DEFAULT_URL_EXPIRATION_TIME;
    private readonly DEFAULT_UPLOAD_CONTAINER;
    private readonly DEFAULT_CONTAINER_ACCESS_LEVEL;
    private _error;
    private _blobService;
    private _blobName;
    private _urlExpirationTime;
    private _metadata;
    private _containerName;
    private _containerAccessLevel;
    constructor(options: IMASOptions);
    _handleFile(req: Request, file: MulterInFile, cb: (error?: any, info?: Partial<MulterOutFile>) => void): Promise<void>;
    _removeFile(req: Request, file: MulterOutFile, cb: (error: Error) => void): Promise<void>;
    /** Helpers */
    private _doesContainerExists;
    private _createContainerIfNotExists;
    private _getSasToken;
    private _getUrl;
    private _getBlobProperties;
    private _deleteBlobIfExists;
    private _generateBlobName;
    private _promisifyStaticValue;
    private _promisifyStaticObj;
}
export default MulterAzureStorage;
