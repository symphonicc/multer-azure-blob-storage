## Multer Azure Blob Storage
[![npm version](https://badge.fury.io/js/multer-azure-blob-storage.svg)](https://badge.fury.io/js/multer-azure-blob-storage) [![Build Status](https://app.travis-ci.com/symphonicc/multer-azure-blob-storage.svg?branch=master)](https://app.travis-ci.com/github/symphonicc/multer-azure-blob-storage)

ES6 &amp; Typescript friendly [Multer](https://github.com/expressjs/multer) storage engine for Azure's blob storage.

### Installation

```
npm i -S multer-azure-blob-storage
```
or
```
yarn add multer-azure-blob-storage
```

### Usage

#### Typescript

Leverages strong typings
``` javascript
import * as multer from 'multer';
import { MulterAzureStorage, MASNameResolver } from 'multer-azure-blob-storage';

const resolveBlobName: MASNameResolver = (req: any, file: Express.Multer.File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const blobName: string = yourCustomLogic(req, file);
        resolve(blobName);
    });
};

export type MetadataObj = { [k: string]: string };
const resolveMetadata: MASObjectResolver = (req: any, file: Express.Multer.File): Promise<MetadataObj> => {
    return new Promise<MetadataObj>((resolve, reject) => {
        const metadata: MetadataObj = yourCustomLogic(req, file);
        resolve(metadata);
    });
};

const resolveContentSettings: MASObjectResolver = (req: any, file: Express.Multer.File): Promise<MetadataObj> => {
    return new Promise<MetadataObj>((resolve, reject) => {
        const contentSettings: MetadataObj = yourCustomLogic(req, file);
        resolve(contentSettings);
    });
};

const azureStorage: MulterAzureStorage = new MulterAzureStorage({
    authenticationType: 'azure ad',    
    accountName: 'mystorageaccountname',
    containerName: 'documents',
    blobName: resolveBlobName,
    metadata: resolveMetadata,
    contentSettings: resolveContentSettings,
    containerAccessLevel: 'blob',
});

const upload: multer.Instance = multer({
    storage: azureStorage
});

app.post('/documents', upload.any(), (req: Request, res: Response, next: NextFunction) => {
  console.log(req.files)
  res.status(200).json(req.files)
});
```

#### Javascript ES6

Common.js style imports
```javascript
const multer = require('multer')
const MulterAzureStorage = require('multer-azure-blob-storage').MulterAzureStorage;
```

E6 style imports
``` javascript
import * as multer from 'multer';
import { MulterAzureStorage } from 'multer-azure-blob-storage';
```

Rest of the JS code
```javascript
const resolveBlobName = (req, file) => {
    return new Promise((resolve, reject) => {
        const blobName = yourCustomLogic(req, file);
        resolve(blobName);
    });
};

const resolveMetadata = (req, file) => {
    return new Promise((resolve, reject) => {
        const metadata = yourCustomLogic(req, file);
        resolve(metadata);
    });
};

const resolveContentSettings = (req, file) => {
    return new Promise((resolve, reject)) => {
        const contentSettings = yourCustomLogic(req, file);
        resolve(contentSettings);
    };
};

const azureStorage = new MulterAzureStorage({
    authenticationType: 'azure ad',  
    accountName: 'mystorageaccountname',
    containerName: 'documents',
    blobName: resolveBlobName,
    metadata: resolveMetadata,
    contentSettings: resolveContentSettings,
    containerAccessLevel: 'blob'
});

const upload = multer({
    storage: azureStorage
});

app.post('/documents', upload.any(), (req, res, next) => {
  console.log(req.files)
  res.status(200).json(req.files)
});
```

More details on using `upload` can be found in the [Multer documentation](https://github.com/expressjs/multer)

### File information

Multer Azure Blob Storage will return the following information in each file uploaded. This can be found in the `req.files` param:

Key | Description | Note
---|---|---
`fieldname` | The field name/key sent in the form's post request. | Added by Multer
`originalname` | Full original name of the file on the user's computer. | Added by Multer
`encoding` | File encoding type. | Added by Multer
`mimetype` | MIME type of the file. | Added by Multer
`blobName` | Blob/file name of created blob in Azure storage. | 
`container` | Name of azure storage container where the blob/file was uploaded to. | 
`blobType` | Type of blob. | From the result of call to azure's `getProperties()` of `BlockBlobClient`
`size` | Size of the blob. | From the result of call to azure's `getProperties()` of `BlockBlobCClient`
`etag` | Etag. | From the result of call to azure's `getProperties()` of `BlockBlobCClient`
`metadata` | Blob's metadata. | From the result of call to azure's `getProperties()` of `BlockBlobClient`
`url` | The full url to access the uploaded blob/file. | obtained from 'BlockBlobClient'

### Configuration object
Details of the configuration object that needs to be passed into the constructor of the MulterAzureStorage class.

| Parameter Name | Type | Sample Value |
|---|---|---|
| `authenticationType` | `string` | `'azure ad'` or `'sas token'` or `'connection string'` or `'account name and key'` |
| `sasToken` | `string` | `sp=racwdl&st=2020-02-02T02:02:02Z&se=2020-02-02T02:12:02Z&spr=https&sv=2020-02-02&sr=c&sig=xxxxx`
| `connectionString` | `string` | `'DefaultEndpointsProtocol=https;AccountName=mystorageaccountname;AccountKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY;EndpointSuffix=core.windows.net'` |
| `accessKey` | `string` | `'wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY'` |
| `accountName` | `string` | `'mystorageaccountname'` |
| `containerName` | `string` or `function: MASNameResolver` | `'documents'` or `(req: any, file: Express.Multer.File) => Promise<string>` |
| `metadata` | `{ [k: string]: string }` or `function: MASObjectResolver` | `'{author: John Doe; album: ASOT}'` or `(req: any, file: Express.Multer.File) => Promise<{[k: string]: string}>` |
| `blobName` | `function: MASNameResolver` (optional) | `(req: any, file: Express.Multer.File) => Promise<string>` |
| `containerAccessLevel` | `string` (optional) | `'blob'` or `'container'` or `'private'` |
| `urlExpirationTime` | `number` (optional) | `60` |

For more information about the meaning of individual parameters please check [Azure documentation](https://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-blob-storage/) on node.js integration.

### Defaults

For the optional parameters in the configuration object for the MulterAzureStorage class, here are the default fallbacks:
- `containerAccessLevel`: private
- `blobName`: Date.now() + '-' + uuid.v4() + path.extname(file.originalname). This results in a url safe filename that looks like `'1511161727560-d83d24c8-d213-444c-ba72-316c7a858805.png'`

### File naming

The `containerName` can be anything you choose, as long as it's unique to the storage account and as long as it fits Azure's naming restrictions. If the container does not exist the storage engine will create it.

The `blobName` in an Azure container also needs to have a unique name.

`multer-azure-blob-storage` allows you to customize the `containerName` and `blobName` per request before uploading the file. This can be done by proving a `MASNameResolver` function in the configuation object for the desired parameter.
``` javascript
const resolveName: MASNameResolver = (req: any, file: Express.Multer.File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        // Compute containerName or blobName with your custom logic.
        const computedName: string = yourCustomLogic(req, file);
        resolve(computedName);
    });
};
```

`multer-azure-blob-storage` also allows you to add/customize `metadata` and `contentSettings` per request before uploading the file. This can be done by proving a `MASObjectResolver` function in the configuation object for the desired parameter.
``` javascript
export type MetadataObj = { [k: string]: string };
const resolveMetadata: MASObjectResolver = (req: any, file: Express.Multer.File): Promise<MetadataObj> => {
    return new Promise<MetadataObj>((resolve, reject) => {
        const metadata: MetadataObj = yourCustomLogic(req, file);
        resolve(metadata);
    });
};
```

### Azure

#### Creating a storage account

For instructions on how to create a storage account, see the following [Azure documentation](https://docs.microsoft.com/en-us/azure/storage/common/storage-create-storage-account#create-a-storage-account).

#### Credentials (Quick tips)

`azure ad` is Microsoft's recommended method, please check [Azure Documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs?tabs=connection-string%2Croles-azure-portal%2Csign-in-azure-cli#authenticate-to-azure-and-authorize-access-to-blob-data) for more details on how to configure the blob storage account.

If this is not an option, `sas token` authorization allows more granular control of access to blob storage. SAS tokens can be generated through the Azure portal for storage accounts and can be restricted to containers.

A valid connection string can contain a SAS token or the account name/key.

For explicit account name and access key authentication, provide the access key available through the Azure portal, and the name of the storage account. This method is the least secure and allows clients unrestricted access to all containers on the storage account.

Never commit SAS tokens, connection strings, or access keys to version control.

For backward compatibility, if no authenticaionType is provided, it will attempt to use a connection string or account name / access key.

If using the MulterAzureStorage class without passing in any configuration options then the following environment variables will need to be set or provided in the .env file:
1. AZURE_STORAGE_CONNECTION_STRING, for the `connectionString`.
2. AZURE_STORAGE_ACCESS_KEY, for the `accessKey`.
3. AZURE_STORAGE_ACCOUNT, for the `accountName`.
4. AZURE_STORAGE_SAS_TOKEN, for the `sasToken`
5. See [additional documentation] (https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme?view=azure-node-latest#defaultazurecredential) on how to configure your application to securely use Azure AD for blob storage integration. In development you must include [one of these sets of credential variables](https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme?view=azure-node-latest#defaultazurecredential) as environment variables or entries in .env file.

### Tests
Not implemented yet

### Thanks
All great things are built on the shoulder of giants. I want to thank my giants for lending their shoulders:
- [mckalexee](https://github.com/mckalexee/multer-azure)
- [MantaCodeDevs](https://github.com/MantaCodeDevs/multer-azure-storage)


### License

[MIT](LICENSE)
