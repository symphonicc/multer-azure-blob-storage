"use strict";
// *********************************************************
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE.txt', which is part of this source code package.
//
// *********************************************************
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node Modules
var node_uuid_1 = require("node-uuid");
var path_1 = require("path");
var azure_storage_1 = require("azure-storage");
// Custom error class
var MASError = /** @class */ (function () {
    function MASError(message) {
        this.errorList = [];
        this.name = "Multer Azure Error";
        this.message = message ? message : null;
    }
    return MASError;
}());
exports.MASError = MASError;
var MulterAzureStorage = /** @class */ (function () {
    function MulterAzureStorage(options) {
        this.DEFAULT_URL_EXPIRATION_TIME = 60;
        this.DEFAULT_UPLOAD_CONTAINER = "default-container";
        this.DEFAULT_CONTAINER_ACCESS_LEVEL = "blob";
        // Init error array
        var errorLength = 0;
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
            var inflection = errorLength > 1 ? ["are", "s"] : ["is", ""];
            this._error.message = "There " + inflection[0] + " " + errorLength + " missing required parameter" + inflection[1] + ".";
            throw this._error;
        }
        // Set proper container name
        switch (typeof options.containerName) {
            case "string":
                this._containerName = this._promisifyStaticValue(options.containerName);
                break;
            case "function":
                this._containerName = options.containerName;
                break;
            default:
                // Catch for if container name is provided but not a desired type    
                this._containerName = this._promisifyStaticValue(this.DEFAULT_UPLOAD_CONTAINER);
                break;
        }
        // Set container access level
        switch (options.containerAccessLevel) {
            case "container":
                this._containerAccessLevel = "container";
                break;
            case "private":
                // For private, unsetting the container access level will
                // ensure that _createContainerIfNotExists doesn't set one
                // which results in a private container.
                this._containerAccessLevel = null;
                break;
            case "blob":
            default:
                this._containerAccessLevel = this.DEFAULT_CONTAINER_ACCESS_LEVEL;
                break;
        }
        // Set proper blob name
        this._blobName = options.blobName ? options.blobName : this._generateBlobName;
        // Set url expiration time
        this._urlExpirationTime = (options.urlExpirationTime && (typeof options.urlExpirationTime === "number") && (options.urlExpirationTime > 0)) ?
            +options.urlExpirationTime :
            this.DEFAULT_URL_EXPIRATION_TIME;
        // Init blob service
        this._blobService = options.connectionString ?
            new azure_storage_1.BlobService(options.connectionString) :
            new azure_storage_1.BlobService(options.accountName, options.accessKey);
    }
    MulterAzureStorage.prototype._handleFile = function (req, file, cb) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var blobName_1, containerName_1, blobStream, hFError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Ensure we have no errors during setup
                        if (this._error.errorList.length > 0) {
                            cb(this._error);
                        }
                        else {
                            // All good. Continue...
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this._blobName(req, file)];
                    case 2:
                        blobName_1 = _a.sent();
                        return [4 /*yield*/, this._containerName(req, file)];
                    case 3:
                        containerName_1 = _a.sent();
                        // Create container if it doesnt exist
                        return [4 /*yield*/, this._createContainerIfNotExists(containerName_1, this._containerAccessLevel)];
                    case 4:
                        // Create container if it doesnt exist
                        _a.sent();
                        blobStream = this._blobService.createWriteStreamToBlockBlob(containerName_1, blobName_1, function (cWSTBBError, result, response) {
                            if (cWSTBBError) {
                                cb(cWSTBBError);
                            }
                            else {
                                // All good. Continue...
                            }
                        });
                        // Upload away
                        file.stream.pipe(blobStream);
                        // Listen for changes
                        blobStream.on("close", function () { return __awaiter(_this, void 0, void 0, function () {
                            var url, blobProperties, intermediateFile, finalFile;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        url = this._getUrl(containerName_1, blobName_1);
                                        return [4 /*yield*/, this._getBlobProperties(containerName_1, blobName_1)];
                                    case 1:
                                        blobProperties = _a.sent();
                                        intermediateFile = {
                                            url: url,
                                            blobName: blobName_1,
                                            etag: blobProperties.etag,
                                            blobType: blobProperties.blobType,
                                            metadata: blobProperties.metadata,
                                            container: blobProperties.container,
                                            blobSize: blobProperties.contentLength
                                        };
                                        finalFile = Object.assign({}, file, intermediateFile);
                                        cb(null, finalFile);
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        blobStream.on("error", function (bSError) {
                            cb(bSError);
                        });
                        return [3 /*break*/, 6];
                    case 5:
                        hFError_1 = _a.sent();
                        cb(hFError_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    MulterAzureStorage.prototype._removeFile = function (req, file, cb) {
        return __awaiter(this, void 0, void 0, function () {
            var containerName, result, rFError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Ensure we have no errors during setup
                        if (this._error.errorList.length > 0) {
                            cb(this._error);
                        }
                        else {
                            // All good. Continue...
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this._containerName(req, file)];
                    case 2:
                        containerName = _a.sent();
                        return [4 /*yield*/, this._doesContainerExists(containerName)];
                    case 3:
                        result = _a.sent();
                        if (!!result.exists) return [3 /*break*/, 4];
                        this._error.message = "Cannot use container. Check if provided options are correct.";
                        cb(this._error);
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this._deleteBlobIfExists(containerName, file.filename)];
                    case 5:
                        _a.sent();
                        cb(null);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        rFError_1 = _a.sent();
                        cb(rFError_1);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /** Helpers */
    MulterAzureStorage.prototype._doesContainerExists = function (containerName) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._blobService.doesContainerExist(containerName, function (error, result, response) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    };
    MulterAzureStorage.prototype._createContainerIfNotExists = function (name, accessLevel) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // if no access level is set, it defaults to private
            if (accessLevel) {
                _this._blobService.createContainerIfNotExists(name, { publicAccessLevel: accessLevel }, function (error, result, response) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                _this._blobService.createContainerIfNotExists(name, function (error, result, response) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    };
    MulterAzureStorage.prototype._getSasToken = function (containerName, blobName, expiration) {
        return this._blobService.generateSharedAccessSignature(containerName, blobName, {
            AccessPolicy: {
                Expiry: azure_storage_1.date.minutesFromNow(expiration),
                Permissions: azure_storage_1.BlobUtilities.SharedAccessPermissions.READ
            }
        });
    };
    MulterAzureStorage.prototype._getUrl = function (containerName, blobName, expiration) {
        if (expiration === void 0) { expiration = this._urlExpirationTime; }
        var sasToken = this._getSasToken(containerName, blobName, expiration);
        return this._blobService.getUrl(containerName, blobName, sasToken);
    };
    MulterAzureStorage.prototype._getBlobProperties = function (containerName, blobName) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._blobService.getBlobProperties(containerName, blobName, function (error, result, response) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    };
    MulterAzureStorage.prototype._deleteBlobIfExists = function (containerName, blobName) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._blobService.deleteBlobIfExists(containerName, blobName, function (error, result, response) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    MulterAzureStorage.prototype._generateBlobName = function (req, file) {
        return new Promise(function (resolve, reject) {
            resolve(Date.now() + "-" + node_uuid_1.v4() + path_1.extname(file.originalname));
        });
    };
    MulterAzureStorage.prototype._promisifyStaticValue = function (value) {
        return function (req, file) {
            return new Promise(function (resolve, reject) {
                resolve(value);
            });
        };
    };
    return MulterAzureStorage;
}());
exports.MulterAzureStorage = MulterAzureStorage;
//# sourceMappingURL=MulterAzureStorage.js.map