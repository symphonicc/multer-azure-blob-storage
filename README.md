## Multer Azure Blob Storage
[![npm version](https://badge.fury.io/js/multer-azure-blob-storage.svg)](https://badge.fury.io/js/multer-azure-blob-storage) [![Build Status](https://travis-ci.org/Sliverb/multer-azure-blob-storage.svg?branch=master)](https://travis-ci.org/Sliverb/multer-azure-blob-storage)

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
    connectionString: 'DefaultEndpointsProtocol=https;AccountName=mystorageaccountname;AccountKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY;EndpointSuffix=core.windows.net',
    accessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY',
    accountName: 'mystorageaccountname',
    containerName: 'documents',
    blobName: resolveBlobName,
    metadata: resolveMetadata,
    contentSettings: resolveContentSettings,
    containerAccessLevel: 'blob',
    urlExpirationTime: 60
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
    connectionString: 'DefaultEndpointsProtocol=https;AccountName=mystorageaccountname;AccountKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY;EndpointSuffix=core.windows.net',
    accessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY',
    accountName: 'mystorageaccountname',
    containerName: 'documents',
    blobName: resolveBlobName,
    metadata: resolveMetadata,
    contentSettings: resolveContentSettings,
    containerAccessLevel: 'blob',
    urlExpirationTime: 60
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
`blobType` | Type of blob. | From the result of call to azure's `getBlobProperties()` of `blobService`
`size` | Size of the blob. | From the result of call to azure's `getBlobProperties()` of `blobService`
`etag` | Etag. | From the result of call to azure's `getBlobProperties()` of `blobService`
`metadata` | Blob's metadata. | From the result of call to azure's `getBlobProperties()` of `blobService`
`url` | The full url to access the uploaded blob/file. | 

### Configuration object
Details of the configuration object that needs to be passed into the constructor of the MulterAzureStorage class.

| Parameter Name | Type | Sample Value |
|---|---|---|
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
- `containerAccessLevel`: blob
- `urlExpirationTime`: 60 minutes. NOTE: To unset this property and not revert to the default, pass in `-1`
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

Your credentials can all be obtained under the Access keys section in the storage account pane in Azure.

The `connectionString` is prefered. If its not provides, please provide `accessKey` and `accountName`.

You only need to provide one of the two access keys in the `accessKey` field.

The `accountName` is just the name of your storage account that you've created in Azure.

If using the MulterAzureStorage class without passing in any configuration options then the following environment variables will need to be set:
1. AZURE_STORAGE_CONNECTION_STRING, for the `connectionString`.
2. AZURE_STORAGE_ACCESS_KEY, for the `accessKey`.
3. AZURE_STORAGE_ACCOUNT, for the `accountName`.

### Tests
Not implemented yet

### Thanks
All great things are built on the shoulder of giants. I want to thank my giants for lending their shoulders:
- [mckalexee](https://github.com/mckalexee/multer-azure)
- [MantaCodeDevs](https://github.com/MantaCodeDevs/multer-azure-storage)


### License

[MIT](LICENSE)
