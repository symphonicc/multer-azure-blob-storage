// *********************************************************
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE.txt', which is part of this source code package.
//
// *********************************************************

// Node Modules
import { v4 } from "uuid";
import { extname } from "path";
import { Request } from "express";
import { StorageEngine } from "multer";
import { Stream, Writable } from "stream";
import { BlobService, date, BlobUtilities } from "azure-storage";

// Custom types
export type MetadataObj = { [k: string]: string };
export type MASNameResolver = (req: Request, file: Express.Multer.File) => Promise<string>;
export type MASObjectResolver = (req: Request, file: Express.Multer.File) => Promise<Object>;

// Custom interfaces
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

// Custom error class
export class MASError implements Error {
    name: string;
    message: string;
    errorList: any[];

    constructor(message?: string) {
        this.errorList = [];
        this.name = "Multer Azure Error";
        this.message = message ? message : null;
    }
}

export class MulterAzureStorage implements StorageEngine {
    private readonly DEFAULT_URL_EXPIRATION_TIME: number = 60;
    private readonly DEFAULT_UPLOAD_CONTAINER: string = "default-container";
    private readonly DEFAULT_CONTAINER_ACCESS_LEVEL: string = /* aka private */ BlobUtilities.BlobContainerPublicAccessType.OFF;

    private _error: MASError;
    private _blobService: BlobService;
    private _blobName: MASNameResolver;
    private _urlExpirationTime: number;
    private _metadata: MASObjectResolver;
    private _containerName: MASNameResolver;
    private _containerAccessLevel: string;

    constructor(options: IMASOptions) {
        // Init error array
        let errorLength: number = 0;
        this._error = new MASError();
        // Connection is preferred.
        options.connectionString = (options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING || null);
        if (!options.connectionString) {
            options.accessKey = (options.accessKey || process.env.AZURE_STORAGE_ACCESS_KEY || null);
            options.accountName = (options.accountName || process.env.AZURE_STORAGE_ACCOUNT || null);
            // Access key is required if no connection string is provided
            if (!options.accessKey) {
                errorLength++;
                this._error.errorList.push(new Error("Missing required parameter: Azure blob storage access key."));
            }
            // Account name is required if no connection string is provided
            if (!options.accountName) {
                errorLength++;
                this._error.errorList.push(new Error("Missing required parameter: Azure blob storage account name."));
            }
        }
        // Container name is required
        if (!options.containerName) {
            errorLength++;
            this._error.errorList.push(new Error("Missing required parameter: Azure container name."));
        }
        // Vaidate errors before proceeding
        if (errorLength > 0) {
            const inflection: string[] = errorLength > 1 ? ["are", "s"] : ["is", ""];
            this._error.message = `There ${inflection[0]} ${errorLength} missing required parameter${inflection[1]}.`;
            throw this._error;
        }
        // Set proper container name
        switch (typeof options.containerName) {
            case "string":
                this._containerName = this._promisifyStaticValue(<string>options.containerName);
                break;

            case "function":
                this._containerName = <MASNameResolver>options.containerName;
                break;

            default:
                // Catch for if container name is provided but not a desired type    
                this._containerName = this._promisifyStaticValue(this.DEFAULT_UPLOAD_CONTAINER);
                break;
        }
        // Set container access level
        switch (options.containerAccessLevel) {
            case BlobUtilities.BlobContainerPublicAccessType.CONTAINER:
                this._containerAccessLevel = BlobUtilities.BlobContainerPublicAccessType.CONTAINER;
                break;

            case BlobUtilities.BlobContainerPublicAccessType.OFF:
                // For private, unsetting the container access level will
                // ensure that _createContainerIfNotExists doesn't set one
                // which results in a private container.
                this._containerAccessLevel = BlobUtilities.BlobContainerPublicAccessType.OFF;
                break;

            case BlobUtilities.BlobContainerPublicAccessType.BLOB:
                this._containerAccessLevel = BlobUtilities.BlobContainerPublicAccessType.BLOB;
                break;
                
            default:
                // Fallback to the default container level
                this._containerAccessLevel = this.DEFAULT_CONTAINER_ACCESS_LEVEL;
                break;

        }
        // Check for metadata
        if (!options.metadata) {
            this._metadata = null;
        } else {
            switch (typeof options.metadata) {
                case "object":
                    this._metadata = this._promisifyStaticObj(<MetadataObj>options.metadata);
                    break;

                case "function":
                    this._metadata = <MASObjectResolver>options.metadata;
                    break;

                default:
                    // Nullify all other types
                    this._metadata = null;
                    break;
            }
        }
        // Set proper blob name
        this._blobName = options.blobName ? options.blobName : this._generateBlobName;
        // Set url expiration time
        this._urlExpirationTime = (options.urlExpirationTime && (typeof options.urlExpirationTime === "number") && (options.urlExpirationTime > 0)) ?
            +options.urlExpirationTime :
            this.DEFAULT_URL_EXPIRATION_TIME;
        // Init blob service
        this._blobService = options.connectionString ?
            new BlobService(options.connectionString) :
            new BlobService(options.accountName, options.accessKey);
    }

    async _handleFile(req: Request, file: MulterInFile, cb: (error?: any, info?: Partial<MulterOutFile>) => void) {
        // Ensure we have no errors during setup
        if (this._error.errorList.length > 0) {
            cb(this._error);
        } else {
            // All good. Continue...
        }
        // Begin handling file
        try {
            // Resolve blob name and container name
            const blobName: string = await this._blobName(req, file);
            const containerName: string = await this._containerName(req, file);
            // Create container if it doesnt exist
            await this._createContainerIfNotExists(containerName, this._containerAccessLevel);
            // Prep stream
            let blobStream: Writable;
            if (this._metadata == null) {
                blobStream = this._blobService.createWriteStreamToBlockBlob(containerName, blobName,
                    {
                        contentSettings: {
                            contentType: file.mimetype,
                            contentDisposition: 'inline'
                        }
                    }, 
                    (cWSTBBError, result, response) => {
                    if (cWSTBBError) {
                        cb(cWSTBBError);
                    } else {
                        // All good. Continue...
                    }
                });
            } else {
                const metadata: MetadataObj = <MetadataObj>await this._metadata(req, file);
                blobStream = this._blobService.createWriteStreamToBlockBlob(
                    containerName,
                    blobName,
                    {
                        contentSettings: {
                            contentType: file.mimetype,
                            contentDisposition: 'inline'
                        },
                        metadata: metadata,
                    },
                    (cWSTBBError, result, response) => {
                        if (cWSTBBError) {
                            cb(cWSTBBError);
                        } else {
                            // All good. Continue...
                        }
                    });
            }
            // Upload away
            file.stream.pipe(blobStream);
            // Listen for changes
            blobStream.on("close", async () => {
                const url: string = this._getUrl(containerName, blobName);
                const blobProperties: BlobService.BlobResult = await this._getBlobProperties(containerName, blobName);
                const intermediateFile: Partial<MulterOutFile> = {
                    url: url,
                    blobName: blobName,
                    etag: blobProperties.etag,
                    blobType: blobProperties.blobType,
                    metadata: blobProperties.metadata,
                    container: blobProperties.container,
                    blobSize: blobProperties.contentLength
                };
                const finalFile: Partial<MulterOutFile> = Object.assign({}, file, intermediateFile);
                cb(null, finalFile);
            });
            blobStream.on("error", (bSError) => {
                cb(bSError);
            });
        } catch (hFError) {
            cb(hFError);
        }
    }

    async _removeFile(req: Request, file: MulterOutFile, cb: (error: Error) => void) {
        // Ensure we have no errors during setup
        if (this._error.errorList.length > 0) {
            cb(this._error);
        } else {
            // All good. Continue...
        }
        // Begin File removal
        try {
            const containerName: string = await this._containerName(req, file);
            const result: BlobService.ContainerResult = await this._doesContainerExists(containerName);
            if (!result.exists) {
                this._error.message = "Cannot use container. Check if provided options are correct.";
                cb(this._error);
            } else {
                await this._deleteBlobIfExists(containerName, file.blobName);
                cb(null);
            }
        } catch (rFError) {
            cb(rFError);
        }
    }


    /** Helpers */

    private _doesContainerExists(containerName: string): Promise<BlobService.ContainerResult> {
        return new Promise<BlobService.ContainerResult>((resolve, reject) => {
            this._blobService.doesContainerExist(
                containerName,
                (error, result, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    private _createContainerIfNotExists(name: string, accessLevel?: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // if no access level is set, it defaults to private
            if (accessLevel) {
                this._blobService.createContainerIfNotExists(
                    name,
                    { publicAccessLevel: accessLevel },
                    (error, result, response) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
            } else {
                this._blobService.createContainerIfNotExists(
                    name,
                    (error, result, response) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
            }
        });

    }

    private _getSasToken(
        containerName: string,
        blobName: string,
        expiration: number
    ): string {
        return this._blobService.generateSharedAccessSignature(
            containerName,
            blobName,
            {
                AccessPolicy: {
                    Expiry: date.minutesFromNow(expiration),
                    Permissions: BlobUtilities.SharedAccessPermissions.READ
                }
            });
    }

    private _getUrl(containerName: string, blobName: string, expiration: number = this._urlExpirationTime): string {
        const sasToken = this._getSasToken(containerName, blobName, expiration);
        return this._blobService.getUrl(containerName, blobName, sasToken);
    }

    private _getBlobProperties(containerName: string, blobName: string): Promise<BlobService.BlobResult> {
        return new Promise<BlobService.BlobResult>((resolve, reject) => {
            this._blobService.getBlobProperties(
                containerName,
                blobName,
                (error, result, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    private _deleteBlobIfExists(containerName: string, blobName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._blobService.deleteBlobIfExists(
                containerName,
                blobName,
                (error, result, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
        });
    }

    private _generateBlobName(req: Request, file: Express.Multer.File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            resolve(`${Date.now()}-${v4()}${extname(file.originalname)}`);
        });
    }

    private _promisifyStaticValue(value: string): MASNameResolver {
        return (req: Request, file: Express.Multer.File): Promise<string> => {
            return new Promise<string>((resolve, reject) => {
                resolve(value);
            });
        };
    }

    private _promisifyStaticObj<T>(value: T): MASObjectResolver {
        return (req: Request, file: Express.Multer.File): Promise<T> => {
            return new Promise<T>((resolve, reject) => {
                resolve(value);
            });
        };
    }
}

export default MulterAzureStorage;