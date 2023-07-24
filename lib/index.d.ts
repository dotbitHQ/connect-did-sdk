export declare enum ActionErrorCode {
    ABORT = 1000,
    NOT_FOUND = 3001,
    NOT_EXIST = 3002,
    ERROR = 5000,
    UNKNOWN = 9999,
    SUCCESS = 2000
}
export interface IPublicKey {
    x: string;
    y: string;
}
export interface IDeviceData {
    name: string;
    credential: ICredential;
    publicKey: IPublicKey;
    ckbAddr: string;
}
export interface ICredential {
    authenticatorAttachment: string | null;
    id: string;
    rawId: string;
    type: string;
    clientExtensionResults: AuthenticationExtensionsClientOutputs;
}
export declare enum EnumRequestMethods {
    REQUEST_NEW_DEVICE_DATA = "requestNewDeviceData",
    REQUEST_CKB_ADDR_LIST = "requestCKBAddrList",
    REQUEST_SIGN_DATA = "requestSignData",
    REQUEST_RECOVER_DEVICE_DATA = "requestRecoverDeviceData",
    REQUEST_DEVICE_DATA = "requestDeviceData",
    REQUEST_BACKUP_DATA = "requestBackupData"
}
export declare enum EnumResponseMethods {
    RESPONSE_NEW_DEVICE_DATA = "responseNewDeviceData",
    RESPONSE_CKB_ADDR_LIST = "responseCKBAddrList",
    RESPONSE_SIGN_DATA = "responseSignData",
    RESPONSE_RECOVER_DEVICE_DATA = "responseRecoverDeviceData",
    RESPONSE_DEVICE_DATA = "responseDeviceData"
}
export interface IRequestParams<T> {
    method: EnumRequestMethods;
    params: T;
    nextPath?: string;
    prevPath?: string;
    originUrl?: string;
    isInternal?: boolean;
    originData?: any;
}
export interface IResponseData<T> {
    method: EnumResponseMethods;
    data: IData<T>;
}
export interface IData<T> {
    code: number;
    msg: string;
    data: T;
}
export declare class ConnectDID {
    private tabUrl;
    private serviceID;
    private TAB_EVENT;
    constructor(isTestNet?: boolean);
    serializedData(data: any): any;
    deserializedData(data: any, enc?: string): any;
    decodeQRCode(str: string): {
        ckbAddr: string;
        name: string;
    };
    private open;
    private messageHandler;
    private postMessage;
    requestNewDeviceData(): Promise<IData<IDeviceData>>;
    requestDeviceData(): Promise<IData<IDeviceData>>;
    requestSignData(data: {
        msg: string;
    }): Promise<IData<string>>;
    requestRecoverDeviceData(): Promise<IData<IDeviceData>>;
    requestBackupData(data: {
        ckbAddr: string;
        isOpen?: boolean;
    }): string;
}
