/// <reference types="express" />
/// <reference types="multer" />
/// <reference types="node" />
import { Request } from "express";
import { StorageEngine } from "multer";
import { Stream } from "stream";
export declare type ContainerAccessLevel = 'blob' | 'container' | 'private';
export declare type MASNameResolver = (req: Request, file: Express.Multer.File) => Promise<string>;
export interface IMASOptions {
    accessKey?: string;
    accountName?: string;
    connectionString?: string;
    urlExpirationTime?: number;
    blobName?: MASNameResolver;
    containerName: MASNameResolver | string;
    containerAccessLevel?: ContainerAccessLevel;
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
    private _containerName;
    private _containerAccessLevel;
    constructor(options: IMASOptions);
    _handleFile(req: Request, file: MulterInFile, cb: (error?: any, info?: Partial<MulterOutFile>) => void): Promise<void>;
    _removeFile(req: Request, file: Express.Multer.File, cb: (error: Error) => void): Promise<void>;
    /** Helpers */
    private _doesContainerExists(containerName);
    private _createContainerIfNotExists(name, accessLevel?);
    private _getSasToken(containerName, blobName, expiration);
    private _getUrl(containerName, blobName, expiration?);
    private _getBlobProperties(containerName, blobName);
    private _deleteBlobIfExists(containerName, blobName);
    private _generateBlobName(req, file);
    private _promisifyStaticValue(value);
}
