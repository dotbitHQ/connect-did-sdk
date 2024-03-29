import { encode, decode } from "cbor-web";

export class ConnectDIDError extends Error {
  code: number;
  message: string;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export enum ActionErrorCode {
  ABORT = 1000,
  POPUPS_BLOCKED = 1001,
  NOT_FOUND = 3001,
  NOT_EXIST = 3002,
  ERROR = 5000,
  UNKNOWN = 9999,
  SUCCESS = 2000,
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

export enum EnumRequestMethods {
  REQUEST_NEW_DEVICE_DATA = "requestNewDeviceData",
  REQUEST_SIGN_DATA = "requestSignData",
  REQUEST_RECOVER_DEVICE_DATA = "requestRecoverDeviceData",
  REQUEST_DEVICE_DATA = "requestDeviceData",
  REQUEST_DEVICE_SIGN_DATA = "requestDeviceSignData",
  REQUEST_BACKUP_DATA = "requestBackupData",
  REQUEST_WAITING_PAGE = "requestWaitingPage",
  REQUEST_REDIRECT_PAGE = "requestRedirectPage",
  REQUEST_ERROR_PAGE = "requestErrorPage",
}

export enum EnumResponseMethods {
  RESPONSE_NEW_DEVICE_DATA = "responseNewDeviceData",
  RESPONSE_SIGN_DATA = "responseSignData",
  RESPONSE_RECOVER_DEVICE_DATA = "responseRecoverDeviceData",
  RESPONSE_DEVICE_DATA = "responseDeviceData",
  RESPONSE_WAITING_PAGE = "responseWaitingPage",
  RESPONSE_ERROR_PAGE = "responseErrorPage",
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

const pathMap = {
  "requestNewDeviceData": "create-passkey",
  "requestSignData": "sign-data",
  "requestRecoverDeviceData": "recover-passkey",
  "requestDeviceData": "login",
  "requestDeviceSignData": "login",
  "requestBackupData": "backup",
  "requestWaitingPage": "waiting",
  "requestErrorPage": "error",
}


export class ConnectDID {
  private readonly tabUrl: string;
  private readonly isDebug: boolean;

  private readonly debugFlag = "query=1"
  private readonly serviceID = "DeviceAuthServiceIframe";

  private readonly TAB_EVENT = "TabCallBack";

  constructor(isTestNet = false, isDebug = false) {
    this.tabUrl = isTestNet
        ? "https://test-walletbridge.d.id"
        : "https://walletbridge.d.id"
    this.isDebug = isDebug
  }

  serializedData(data: any) {
    return encode(data).toString("hex");
    // return globalThis.encodeURIComponent(data)
  }

  deserializedData(data: any, enc = "hex") {
    return decode(data, enc);
    // return globalThis.decodeURIComponent(data)
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
  private open(origin: string, params: IRequestParams<any>, isNewTab?: boolean, isEncode = true) {
    const width = 430;
    const height = globalThis.innerHeight >= 730 ? 730 : globalThis.innerHeight * 0.8;

    // 计算居中的位置
    const left = (globalThis.innerWidth - width) / 2;
    const top = (globalThis.innerHeight - height) / 2;

    const hash = isEncode ? this.serializedData({
      ...params,
      originUrl: globalThis.location.origin,
    }) : globalThis.btoa(JSON.stringify(
        {
          ...params,
          originUrl: globalThis.location.origin,
        }
    ))

    try {

      const currentURL = new window.URL(origin)

      if (this.isDebug) {
        if (currentURL.search) {
          const searchArray = currentURL.search.slice(1).split("&")
          searchArray.push(this.debugFlag)
          currentURL.search = searchArray.join("&")
        } else {
          currentURL.search = `?${this.debugFlag}`
        }
      }
      if (this.isDebug) {
        console.log("debug: ", `${currentURL.href}#${hash}`)
      }

      return globalThis.open(
          `${currentURL.href}#${hash}`,
          this.serviceID,
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

  private postMessage(opener: Window | null, data: {method: EnumRequestMethods, params: any}) {
    console.log(opener)
    opener?.postMessage({
      method: data.method,
      params: data.params,
    }, this.tabUrl)
  }

  private openPopupWithWaiting(
      origin: string,
      params: IRequestParams<any>,
      onError: (error: ConnectDIDError) => void
  ) {
    return new Promise(
        (
            resolveWrapper: (v: {onNext: (k: any) => Promise<any>, onFailed: (k: any) => Promise<any>, onClose: () => Promise<any>}) => void,
            rejectWrapper: (v: IData<any>) => void,
        ) => {
          const onWaitingError = (event: MessageEvent) => {
            const result = this.messageHandler(event);
            if (result) {
              globalThis.removeEventListener("message", onWaitingError);
              if (result.data.code !== ActionErrorCode.SUCCESS) {
                popupWindow = null;
                onError(new ConnectDIDError(result.data.code, result.data.message || result.data.msg));
              } else {
                resolveWrapper({
                  onNext,
                  onFailed,
                  onClose,
                })
              }
            }
          };

          globalThis.addEventListener("message", onWaitingError);
          let popupWindow = this.open(origin, params);

          if (!popupWindow) {
            rejectWrapper({
              code: ActionErrorCode.POPUPS_BLOCKED,
              message: "open window is failed, Popups are blocked.",
              data: {},
            })
          }

          const onNext = ({method, params}: {method: EnumRequestMethods, params: any}) => {
            return new Promise(
                (
                    resolve: (value: IData<any>) => void,
                    reject: (value: IData<any>) => void,
                ) => {
                  if (!popupWindow) {
                    reject({
                      code: ActionErrorCode.ERROR,
                      message: "no associated popups were found.",
                      data: {},
                    });
                  }
                  globalThis.removeEventListener("message", onWaitingError);

                  const hash = method !== EnumRequestMethods.REQUEST_BACKUP_DATA ? this.serializedData({
                    method,
                    params,
                    originUrl: globalThis.location.origin,
                  }) : globalThis.btoa(JSON.stringify(
                      {
                        method,
                        params,
                        originUrl: globalThis.location.origin,
                      }
                  ))

                  const onResult = (event: MessageEvent) => {
                    const result = this.messageHandler(event);
                    if (result) {
                      globalThis.removeEventListener("message", onResult);
                      if (result.data.code === ActionErrorCode.SUCCESS) {
                        resolve(result.data);
                      } else {
                        reject(result.data);
                      }
                    }
                  };
                  globalThis.addEventListener("message", onResult);
                  this.postMessage(popupWindow, {
                    method: EnumRequestMethods.REQUEST_REDIRECT_PAGE,
                    params: `${this.tabUrl}/${pathMap[method]}#${hash}`
                  })
                },
            );
          }

          const onClose = () => {
            globalThis.removeEventListener("message", onWaitingError);
            if (!popupWindow) {
              console.log("onClose");
              return Promise.reject({
                code: ActionErrorCode.ERROR,
                message: "no associated popups were found.",
                data: {},
              });
            }
            popupWindow.close();
            return Promise.resolve();
          }

          const onFailed = () => {
            globalThis.removeEventListener("message", onWaitingError);
            if (!popupWindow) {
              console.log("onNext");
              return Promise.reject({
                code: ActionErrorCode.ERROR,
                message: "no associated popups were found.",
                data: {},
              });
            }
            return new Promise(
                (
                    resolve: (value: IData<any>) => void,
                    reject: (value: IData<any>) => void,
                ) => {
                  const onResult = (event: MessageEvent) => {
                    const result = this.messageHandler(event);
                    if (result) {
                      globalThis.removeEventListener("message", onResult);
                      if (result.data.code !== ActionErrorCode.SUCCESS) {
                        reject(result.data);
                      }
                    }
                  };
                  globalThis.addEventListener("message", onResult);

                  const failedHash = this.serializedData({
                    method: EnumRequestMethods.REQUEST_ERROR_PAGE,
                    internal: true,
                    originUrl: globalThis.location.origin,
                  })

                  this.postMessage(popupWindow, {
                    method: EnumRequestMethods.REQUEST_REDIRECT_PAGE,
                    params: `${this.tabUrl}/${pathMap[EnumRequestMethods.REQUEST_ERROR_PAGE]}#${failedHash}`
                  })
                },
            );
          }
        },
    )
  }

  private openPopup(
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
    return this.openPopup(`${this.tabUrl}/${pathMap.requestNewDeviceData}`, {
      method: EnumRequestMethods.REQUEST_NEW_DEVICE_DATA,
      params: {},
    });
  }

  requestDeviceData(): Promise<IData<IDeviceData>> {
    return this.openPopup(`${this.tabUrl}/${pathMap.requestDeviceData}`, {
      method: EnumRequestMethods.REQUEST_DEVICE_DATA,
      params: {},
    });
  }

  requestSignData(data: { msg: string }): Promise<IData<string>> {
    return this.openPopup(`${this.tabUrl}/${pathMap.requestSignData}`, {
      method: EnumRequestMethods.REQUEST_SIGN_DATA,
      params: data,
    });
  }

  requestDeviceSignData(data: {msg: string}): Promise<IData<ISignDeviceData>> {
    return this.openPopup(`${this.tabUrl}/${pathMap.requestDeviceSignData}`, {
      method: EnumRequestMethods.REQUEST_DEVICE_SIGN_DATA,
      params: {
        msg: data.msg,
        haveDeviceData: true,
      },
    });
  }

  requestRecoverDeviceData(): Promise<IData<IDeviceData>> {
    return this.openPopup(`${this.tabUrl}/${pathMap.requestRecoverDeviceData}`, {
      method: EnumRequestMethods.REQUEST_RECOVER_DEVICE_DATA,
      params: {},
    });
  }

  requestBackupData(data: { ckbAddr: string; isOpen?: boolean }) {
    let url: string = "";
    if (data.isOpen) {
      this.open(
          `${this.tabUrl}/${pathMap.requestBackupData}`,
          {
            method: EnumRequestMethods.REQUEST_BACKUP_DATA,
            isInternal: true,
            params: data,
          },
          true,
          false,
      );
    } else {
      const hash = globalThis.btoa(JSON.stringify({
        method: EnumRequestMethods.REQUEST_BACKUP_DATA,
        isInternal: true,
        params: data,
        originUrl: globalThis.location.origin,
      }));
      url = `${this.tabUrl}/${pathMap.requestBackupData}#${hash}`;
    }
    return url;
  }

  requestWaitingPage(onError: (error: ConnectDIDError) => void) {
    return this.openPopupWithWaiting(
      `${this.tabUrl}/${pathMap.requestWaitingPage}`,
      {
        method: EnumRequestMethods.REQUEST_WAITING_PAGE,
        params: {},
      },
      onError
    );
  }
}
