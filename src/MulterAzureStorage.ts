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
import { Readable } from "stream";
import { BlobServiceClient, StorageSharedKeyCredential, BlockBlobUploadStreamOptions, ContainerCreateResponse } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

// Custom types
export type MetadataObj = { [k: string]: string };
export type MASNameResolver = (req: Request, file: Express.Multer.File) => Promise<string>;
export type MASObjectResolver = (req: Request, file: Express.Multer.File) => Promise<Object>;

// Custom interfaces
export interface IMASOptions {
    authenticationType: 'azure ad'| 'sas token' | 'connection string' |  'account name and key' ;
    sasToken?: string;
    accessKey?: string;
    accountName?: string;
    connectionString?: string;
    urlExpirationTime?: number;
    blobName?: MASNameResolver;
    containerName: MASNameResolver | string;
    metadata?: MASObjectResolver | MetadataObj;
    contentSettings?: MASObjectResolver | MetadataObj;
    //note, null means no public access
    //https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/containercreateoptions?view=azure-node-latest
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
    private readonly DEFAULT_URL_EXPIRATION_TIME: number = 60; // Minutes
    private readonly DEFAULT_UPLOAD_CONTAINER: string = "default-container";    

    private _error: MASError;
    //private _blobService: BlobService;
    private _blobServiceClient: BlobServiceClient;
    private _blobName: MASNameResolver;
    private _urlExpirationTime: number | null;
    private _metadata: MASObjectResolver;
    private _contentSettings: MASObjectResolver;
    private _containerName: MASNameResolver;
    private _containerAccessLevel: string;

    constructor(options: IMASOptions) {
        // Init error array
        let errorLength = 0;
        this._error = new MASError();        

        // Container name is required
        if (!options.containerName) {
            errorLength++;
            this._error.errorList.push(new Error("Missing required parameter: Azure container name."));
        }

        //check to allow these values in environment file
        options.accessKey = (options.accessKey || process.env.AZURE_STORAGE_ACCESS_KEY || null);
        options.accountName = (options.accountName || process.env.AZURE_STORAGE_ACCOUNT || null);
        options.sasToken = (options.sasToken || process.env.AZURE_STORAGE_SAS_TOKEN || null);

        switch (options.authenticationType){
            case 'azure ad': {
                const credential = new DefaultAzureCredential();
                this._blobServiceClient = new BlobServiceClient(
                    `https://${options.accountName}.blob.core.windows.net`,
                    credential
                );
                break;
            }
            case 'account name and key': {
                if (!options.accessKey) {
                    errorLength++;
                    this._error.errorList.push(new Error("Missing required parameter for account name/key auth: Azure blob storage access key."));                    
                }
                if (!options.accountName) {
                    errorLength++;
                    this._error.errorList.push(new Error("Missing required parameter for account name/key auth: Azure blob storage account name."));
                }
                if (options.accountName && options.accessKey){
                    const sharedKeyCredential = new StorageSharedKeyCredential(options.accountName, options.accessKey);
                    this._blobServiceClient = new BlobServiceClient(
                    `https://${options.accountName}.blob.core.windows.net`,
                    sharedKeyCredential
                    );
                }
                break; 
            }
            case 'sas token': {
                if (!options.accountName) {
                    errorLength++;
                    this._error.errorList.push(new Error("Missing required parameter for SAS token auth: Azure blob storage account name."));
                }
                if (!options.sasToken) {
                    errorLength++;
                    this._error.errorList.push(new Error("Missing required parameter for SAS token auth: SAS token value."));
                }
                if (options.accountName && options.sasToken){
                    this._blobServiceClient = new BlobServiceClient(`https://${options.accountName}.blob.core.windows.net${options.sasToken}`);
                }
                break;
            }
            case 'connection string': {
                options.connectionString = (options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING || null);
                if (!options.connectionString){
                    errorLength++;
                    this._error.errorList.push(new Error("Missing required parameter for connection string auth: Azure blob storage connection string."));
                }
                this._blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
            break;
            }
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
        // Check for user defined properties
        if (!options.contentSettings) {
            this._contentSettings = null;
        } else {
            switch (typeof options.contentSettings) {
                case "object":
                    this._contentSettings = this._promisifyStaticObj(<MetadataObj>options.contentSettings);
                    break;

                case "function":
                    this._contentSettings = <MASObjectResolver>options.contentSettings;
                    break;

                default:
                    // Nullify all other types
                    this._contentSettings = null;
                    break;
            }
        }
        // Set proper blob name
        this._blobName = options.blobName ? options.blobName : this._generateBlobName;
        // Set url expiration time
        this._urlExpirationTime = (options?.urlExpirationTime === -1)
            ? null
            : (options.urlExpirationTime && (typeof options.urlExpirationTime === "number") && (options.urlExpirationTime > 0))
                ? +options.urlExpirationTime
                : this.DEFAULT_URL_EXPIRATION_TIME;

    }

    //fulfill Multer contract
    async _handleFile(req: Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<MulterOutFile>) => void) {
        // Ensure we have no errors during setup
        if (this._error.errorList.length > 0) {
            callback(this._error, null);
        } else {
            // All good. Continue...
        }
        // Begin handling file
        try {
            // Resolve blob name and container name
            const blobName: string = await this._blobName(req, file);
            const containerName: string = await this._containerName(req, file);
            const containerClient = this._blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            // Create container if it doesnt exist
            await this._createContainerIfNotExists(containerName);
            // Prep stream
           
            let contentSettings: MetadataObj;
            if (this._contentSettings == null) {
                contentSettings = {
                    contentType: file.mimetype,
                    contentDisposition: 'inline'
                };
            } else {
                contentSettings = <MetadataObj>await this._contentSettings(req, file);
            }

            const stream = Readable.from(file.buffer);
            const uploadOptions: BlockBlobUploadStreamOptions = {
                blobHTTPHeaders: { blobContentType: contentSettings.contentType, blobContentDisposition: contentSettings.contentDisposition},
            };
            if (this._metadata){
                uploadOptions.metadata = <MetadataObj>await this._metadata(req, file);
            }

            await blockBlobClient.uploadStream(stream, file.size, 5, uploadOptions);            
            const blobProperties = await blockBlobClient.getProperties();
            const intermediateFile: Partial<MulterOutFile> = {
                    url: blockBlobClient.url,
                    blobName: blockBlobClient.name,
                    etag: blobProperties.etag,
                    blobType: blobProperties.blobType,
                    metadata: blobProperties.metadata,
                    container: blockBlobClient.containerName,
                    blobSize: blobProperties.contentLength?.toString()
                };
            const finalFile: Partial<MulterOutFile> = Object.assign({}, file, intermediateFile);
            callback(null, finalFile);
            }
            catch(err){
                callback(err, null);
            }
    }

    async _removeFile(req: Request, file: MulterOutFile, callback: (error: Error) => void) {
        // Ensure we have no errors during setup
        if (this._error.errorList.length > 0) {
            callback(this._error);
        } else {
            try {
                const containerName: string = await this._containerName(req, file);
                const containerClient = this._blobServiceClient.getContainerClient(containerName);
                const exists = await containerClient.exists();                    
                if (!exists) {
                    this._error.message = `Container ${containerName} does not exist on this account. Check options.`;
                    callback(this._error);
                } else {
                    const blobName = await this._blobName(req, file);
                    await containerClient.deleteBlob(blobName);
                    callback(null);
                }
            } catch (rFError) {
                callback(rFError);
            }
    }
    }


    /** Helpers */

    private _createContainerIfNotExists(name: string): Promise<ContainerCreateResponse> {
        const containerClient = this._blobServiceClient.getContainerClient(name);
        const options:any = {};
        if (this._containerAccessLevel !== 'private'){
            //Note, for private container access level, this option should not be supplied at all.
            options.access = this._containerAccessLevel;
        }
        return containerClient.createIfNotExists(options);                   
    }

    private _generateBlobName(_req: Request, file: Express.Multer.File): Promise<string> {
        return new Promise<string>((resolve, _reject) => {
            resolve(`${Date.now()}-${v4()}${extname(file.originalname)}`);
        });
    }

    private _promisifyStaticValue(value: string): MASNameResolver {
        return (_req: Request, _file: Express.Multer.File): Promise<string> => {
            return new Promise<string>((resolve, _reject) => {
                resolve(value);
            });
        };
    }

    private _promisifyStaticObj<T>(value: T): MASObjectResolver {
        return (_req: Request, _file: Express.Multer.File): Promise<T> => {
            return new Promise<T>((resolve, _reject) => {
                resolve(value);
            });
        };
    }
}

export default MulterAzureStorage;
