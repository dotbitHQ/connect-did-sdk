export declare class ConnectDIDError extends Error {
    code: number;
    message: string;
    constructor(code: number, message: string);
}
export declare enum ActionErrorCode {
    ABORT = 1000,
    POPUPS_BLOCKED = 1001,
    NOT_FOUND = 3001,
    NOT_EXIST = 3002,
    ERROR = 5000,
    UNKNOWN = 9999,
    SUCCESS = 2000
}
export interface IDeviceData {
    name: string;
    device?: string;
    credential: ICredential;
    publicKey: IPublicKey;
    ckbAddr: string;
}
export interface IPublicKey {
    x: string;
    y: string;
}
export interface ISignDeviceData {
    deviceData: IDeviceData;
    signData: string;
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
    REQUEST_SIGN_DATA = "requestSignData",
    REQUEST_RECOVER_DEVICE_DATA = "requestRecoverDeviceData",
    REQUEST_DEVICE_DATA = "requestDeviceData",
    REQUEST_DEVICE_SIGN_DATA = "requestDeviceSignData",
    REQUEST_BACKUP_DATA = "requestBackupData",
    REQUEST_WAITING_PAGE = "requestWaitingPage",
    REQUEST_REDIRECT_PAGE = "requestRedirectPage",
    REQUEST_ERROR_PAGE = "requestErrorPage"
}
export declare enum EnumResponseMethods {
    RESPONSE_NEW_DEVICE_DATA = "responseNewDeviceData",
    RESPONSE_SIGN_DATA = "responseSignData",
    RESPONSE_RECOVER_DEVICE_DATA = "responseRecoverDeviceData",
    RESPONSE_DEVICE_DATA = "responseDeviceData",
    RESPONSE_WAITING_PAGE = "responseWaitingPage",
    RESPONSE_ERROR_PAGE = "responseErrorPage"
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
    message: string;
    data: T;
}
export declare class ConnectDID {
    private readonly tabUrl;
    private readonly isDebug;
    private readonly debugFlag;
    private readonly serviceID;
    private readonly TAB_EVENT;
    constructor(isTestNet?: boolean, isDebug?: boolean);
    serializedData(data: any): any;
    deserializedData(data: any, enc?: string): any;
    decodeQRCode(str: string): {
        ckbAddr: string;
        name: string;
    };
    private open;
    private messageHandler;
    private postMessage;
    private openPopupWithWaiting;
    private openPopup;
    requestNewDeviceData(): Promise<IData<IDeviceData>>;
    requestDeviceData(): Promise<IData<IDeviceData>>;
    requestSignData(data: {
        msg: string;
    }): Promise<IData<string>>;
    requestDeviceSignData(data: {
        msg: string;
    }): Promise<IData<ISignDeviceData>>;
    requestRecoverDeviceData(): Promise<IData<IDeviceData>>;
    requestBackupData(data: {
        ckbAddr: string;
        isOpen?: boolean;
    }): string;
    requestWaitingPage(onError: (error: ConnectDIDError) => void): Promise<{
        onNext: (k: any) => Promise<any>;
        onFailed: (k: any) => Promise<any>;
        onClose: () => Promise<any>;
    }>;
}
