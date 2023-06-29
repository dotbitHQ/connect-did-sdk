import { encode, decode } from "cbor-web";

export enum ActionErrorCode {
  ABORT = 1000,
  NOT_FOUND = 3001,
  NOT_EXIST = 3002,
  ERROR = 5000,
  UNKNOWN = 9999,

  SUCCESS = 2000,
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

export enum EnumRequestMethods {
  REQUEST_NEW_DEVICE_DATA = "requestNewDeviceData",
  REQUEST_CKB_ADDR_LIST = "requestCKBAddrList",
  REQUEST_SIGN_DATA = "requestSignData",
  REQUEST_RECOVER_DEVICE_DATA = "requestRecoverDeviceData",
  REQUEST_DEVICE_DATA = "requestDeviceData",
  REQUEST_BACKUP_DATA = "requestBackupData",
}

export enum EnumResponseMethods {
  RESPONSE_NEW_DEVICE_DATA = "responseNewDeviceData",
  RESPONSE_CKB_ADDR_LIST = "responseCKBAddrList",
  RESPONSE_SIGN_DATA = "responseSignData",
  RESPONSE_RECOVER_DEVICE_DATA = "responseRecoverDeviceData",
  RESPONSE_DEVICE_DATA = "responseDeviceData",
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

class ConnectDIDError extends Error{
  code: number;
  message: string;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.message = message
  }
}


export class ConnectDID {
  private tabUrl: string;

  private serviceID = "DeviceAuthServiceIframe";

  private TAB_EVENT = "TabCallBack";

  constructor(isTestNet = false) {
    this.tabUrl = isTestNet
        ? "https://test-connect.did.id"
        : "https://connect.did.id"
  }

  serializedData(data: any) {
    return encode(data).toString("hex");
  }

  deserializedData(data: any, enc = "hex") {
    return decode(data, enc);
  }

  decodeQRCode(str: string): {ckbAddr: string, name: string} {
    if (!str) return {ckbAddr: "", name: ""};
    try {
      return JSON.parse(window.atob(str))
    } catch (e) {
      throw new ConnectDIDError(ActionErrorCode.UNKNOWN, "unknown error")
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private open(origin: string, prams: IRequestParams<any>, isNewTab?: boolean) {
    const width = 860;
    const height = 780;

    // 计算居中的位置
    const left = (globalThis.innerWidth - width) / 2;
    const top = (globalThis.innerHeight - height) / 2;

    const hash = this.serializedData({
      ...prams,
      originUrl: globalThis.location.origin,
    });

    try {
      globalThis.open(
          `${origin}#${hash}`,
          "",
          !isNewTab
              ? `left=${left},top=${top},width=${width},height=${height},location=no`
              : "",
      );
    } catch (e) {
      throw new ConnectDIDError(ActionErrorCode.UNKNOWN, "unknown error")
    }
  }

  private messageHandler(event: MessageEvent) {
    if (event.origin === this.tabUrl) {
      if (Object.values(EnumResponseMethods).includes(event.data.method)) {
        return event.data;
      }
    }
    return undefined;
  }

  private postMessage(
      origin: string,
      params: IRequestParams<any>,
  ): Promise<IData<any>> {
    return new Promise(
        (
            resolve: (value: IData<any>) => void,
            reject: (value: IData<any>) => void,
        ) => {
          const onNext = (event: MessageEvent) => {
            const result = this.messageHandler(event);
            if (result) {
              globalThis.removeEventListener("message", onNext);
              if (result.data.code === ActionErrorCode.SUCCESS) {
                resolve(result.data);
              } else {
                reject(result.data);
              }
            }
          };
          globalThis.addEventListener("message", onNext);
          this.open(origin, params);
        },
    );
  }

  requestNewDeviceData(): Promise<IData<IDeviceData>> {
    return this.postMessage(`${this.tabUrl}/create-passkey`, {
      method: EnumRequestMethods.REQUEST_NEW_DEVICE_DATA,
      params: {},
    });
  }

  requestDeviceData(): Promise<IData<IDeviceData>> {
    return this.postMessage(`${this.tabUrl}/login`, {
      method: EnumRequestMethods.REQUEST_DEVICE_DATA,
      params: {},
    });
  }

  requestSignData(data: { msg: string }): Promise<IData<string>> {
    return this.postMessage(`${this.tabUrl}/sign-data`, {
      method: EnumRequestMethods.REQUEST_SIGN_DATA,
      params: data,
    });
  }

  requestRecoverDeviceData(): Promise<IData<IDeviceData>> {
    return this.postMessage(`${this.tabUrl}/recover-passkey`, {
      method: EnumRequestMethods.REQUEST_RECOVER_DEVICE_DATA,
      params: {},
    });
  }

  requestBackupData(data: { ckbAddr: string; isOpen?: boolean }) {
    let url: string = "";
    if (data.isOpen) {
      this.open(
          `${this.tabUrl}/backup`,
          {
            method: EnumRequestMethods.REQUEST_BACKUP_DATA,
            isInternal: true,
            params: data,
          },
          true,
      );
    } else {
      const hash = this.serializedData({
        method: EnumRequestMethods.REQUEST_BACKUP_DATA,
        isInternal: true,
        params: data,
        originUrl: globalThis.location.origin,
      });
      url = `${this.tabUrl}/backup#${hash}`;
    }
    return url;
  }
}
