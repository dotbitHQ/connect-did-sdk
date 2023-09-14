import { encode, decode } from "cbor-web";
export class DeviceAuthError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.message = message;
    }
}
export var ActionErrorCode;
(function (ActionErrorCode) {
    ActionErrorCode[ActionErrorCode["ABORT"] = 1000] = "ABORT";
    ActionErrorCode[ActionErrorCode["NOT_FOUND"] = 3001] = "NOT_FOUND";
    ActionErrorCode[ActionErrorCode["NOT_EXIST"] = 3002] = "NOT_EXIST";
    ActionErrorCode[ActionErrorCode["ERROR"] = 5000] = "ERROR";
    ActionErrorCode[ActionErrorCode["UNKNOWN"] = 9999] = "UNKNOWN";
    ActionErrorCode[ActionErrorCode["SUCCESS"] = 2000] = "SUCCESS";
})(ActionErrorCode || (ActionErrorCode = {}));
export var EnumRequestMethods;
(function (EnumRequestMethods) {
    EnumRequestMethods["REQUEST_NEW_DEVICE_DATA"] = "requestNewDeviceData";
    EnumRequestMethods["REQUEST_SIGN_DATA"] = "requestSignData";
    EnumRequestMethods["REQUEST_RECOVER_DEVICE_DATA"] = "requestRecoverDeviceData";
    EnumRequestMethods["REQUEST_DEVICE_DATA"] = "requestDeviceData";
    EnumRequestMethods["REQUEST_DEVICE_SIGN_DATA"] = "requestDeviceSignData";
    EnumRequestMethods["REQUEST_BACKUP_DATA"] = "requestBackupData";
    EnumRequestMethods["REQUEST_WAITING_PAGE"] = "requestWaitingPage";
    EnumRequestMethods["REQUEST_REDIRECT_PAGE"] = "requestRedirectPage";
    EnumRequestMethods["REQUEST_ERROR_PAGE"] = "requestErrorPage";
})(EnumRequestMethods || (EnumRequestMethods = {}));
export var EnumResponseMethods;
(function (EnumResponseMethods) {
    EnumResponseMethods["RESPONSE_NEW_DEVICE_DATA"] = "responseNewDeviceData";
    EnumResponseMethods["RESPONSE_SIGN_DATA"] = "responseSignData";
    EnumResponseMethods["RESPONSE_RECOVER_DEVICE_DATA"] = "responseRecoverDeviceData";
    EnumResponseMethods["RESPONSE_DEVICE_DATA"] = "responseDeviceData";
    EnumResponseMethods["RESPONSE_WAITING_PAGE"] = "responseWaitingPage";
    EnumResponseMethods["RESPONSE_ERROR_PAGE"] = "responseErrorPage";
})(EnumResponseMethods || (EnumResponseMethods = {}));
class ConnectDIDError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.message = message;
    }
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
};
export class ConnectDID {
    constructor(isTestNet = false, isDebug = false) {
        this.debugFlag = "query=1";
        this.serviceID = "DeviceAuthServiceIframe";
        this.TAB_EVENT = "TabCallBack";
        this.tabUrl = isTestNet
            ? "https://test-walletbridge.d.id"
            : "https://walletbridge.d.id";
        this.isDebug = isDebug;
    }
    serializedData(data) {
        return encode(data).toString("hex");
    }
    deserializedData(data, enc = "hex") {
        return decode(data, enc);
    }
    decodeQRCode(str) {
        if (!str)
            return { ckbAddr: "", name: "" };
        try {
            return JSON.parse(window.atob(str));
        }
        catch (e) {
            throw new ConnectDIDError(ActionErrorCode.UNKNOWN, "unknown error");
        }
    }
    open(origin, params, isNewTab, isEncode = true) {
        const width = 430;
        const height = globalThis.innerHeight >= 730 ? 730 : globalThis.innerHeight * 0.8;
        const left = (globalThis.innerWidth - width) / 2;
        const top = (globalThis.innerHeight - height) / 2;
        const hash = isEncode ? this.serializedData({
            ...params,
            originUrl: globalThis.location.origin,
        }) : globalThis.btoa(JSON.stringify({
            ...params,
            originUrl: globalThis.location.origin,
        }));
        try {
            const currentURL = new window.URL(origin);
            if (this.isDebug) {
                if (currentURL.search) {
                    const searchArray = currentURL.search.slice(1).split("&");
                    searchArray.push(this.debugFlag);
                    currentURL.search = searchArray.join("&");
                }
                else {
                    currentURL.search = `?${this.debugFlag}`;
                }
            }
            if (this.isDebug) {
                console.log("debug: ", `${currentURL.href}#${hash}`);
            }
            return globalThis.open(`${currentURL.href}#${hash}`, this.serviceID, !isNewTab
                ? `left=${left},top=${top},width=${width},height=${height},location=no`
                : "");
        }
        catch (e) {
            throw new ConnectDIDError(ActionErrorCode.UNKNOWN, "unknown error");
        }
    }
    messageHandler(event) {
        if (event.origin === this.tabUrl) {
            if (Object.values(EnumResponseMethods).includes(event.data.method)) {
                return event.data;
            }
        }
        return undefined;
    }
    postMessage(opener, data) {
        console.log(opener);
        opener === null || opener === void 0 ? void 0 : opener.postMessage({
            method: data.method,
            params: data.params,
        }, this.tabUrl);
    }
    openPopupWithWaiting(origin, params, onError) {
        return new Promise((resolveWrapper, rejectWrapper) => {
            const onWaitingError = (event) => {
                const result = this.messageHandler(event);
                if (result) {
                    globalThis.removeEventListener("message", onWaitingError);
                    if (result.data.code !== ActionErrorCode.SUCCESS) {
                        popupWindow = null;
                        onError(new DeviceAuthError(result.data.code, result.data.message || result.data.msg));
                    }
                    else {
                        resolveWrapper({
                            onNext,
                            onFailed,
                            onClose,
                        });
                    }
                }
            };
            globalThis.addEventListener("message", onWaitingError);
            let popupWindow = this.open(origin, params);
            if (!popupWindow) {
                rejectWrapper({
                    code: ActionErrorCode.ERROR,
                    msg: "open window is failed",
                    data: {},
                });
            }
            const onNext = ({ method, params }) => {
                return new Promise((resolve, reject) => {
                    if (!popupWindow) {
                        reject({
                            code: ActionErrorCode.ERROR,
                            msg: "window is undefined",
                            data: {},
                        });
                    }
                    globalThis.removeEventListener("message", onWaitingError);
                    const hash = method !== EnumRequestMethods.REQUEST_BACKUP_DATA ? this.serializedData({
                        method,
                        params,
                        originUrl: globalThis.location.origin,
                    }) : globalThis.btoa(JSON.stringify({
                        method,
                        params,
                        originUrl: globalThis.location.origin,
                    }));
                    const onResult = (event) => {
                        const result = this.messageHandler(event);
                        if (result) {
                            globalThis.removeEventListener("message", onResult);
                            if (result.data.code === ActionErrorCode.SUCCESS) {
                                resolve(result.data);
                            }
                            else {
                                reject(result.data);
                            }
                        }
                    };
                    globalThis.addEventListener("message", onResult);
                    this.postMessage(popupWindow, {
                        method: EnumRequestMethods.REQUEST_REDIRECT_PAGE,
                        params: `${this.tabUrl}/${pathMap[method]}#${hash}`
                    });
                });
            };
            const onClose = () => {
                globalThis.removeEventListener("message", onWaitingError);
                if (!popupWindow) {
                    console.log("onClose");
                    return Promise.reject({
                        code: ActionErrorCode.ERROR,
                        msg: "window is undefined",
                        data: {},
                    });
                }
                popupWindow.close();
                return Promise.resolve();
            };
            const onFailed = () => {
                globalThis.removeEventListener("message", onWaitingError);
                if (!popupWindow) {
                    console.log("onNext");
                    return Promise.reject({
                        code: ActionErrorCode.ERROR,
                        msg: "window is undefined",
                        data: {},
                    });
                }
                return new Promise((resolve, reject) => {
                    const onResult = (event) => {
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
                    });
                    this.postMessage(popupWindow, {
                        method: EnumRequestMethods.REQUEST_REDIRECT_PAGE,
                        params: `${this.tabUrl}/${pathMap[EnumRequestMethods.REQUEST_ERROR_PAGE]}#${failedHash}`
                    });
                });
            };
        });
    }
    openPopup(origin, params) {
        return new Promise((resolve, reject) => {
            const onNext = (event) => {
                const result = this.messageHandler(event);
                if (result) {
                    globalThis.removeEventListener("message", onNext);
                    if (result.data.code === ActionErrorCode.SUCCESS) {
                        resolve(result.data);
                    }
                    else {
                        reject(result.data);
                    }
                }
            };
            globalThis.addEventListener("message", onNext);
            this.open(origin, params);
        });
    }
    requestNewDeviceData() {
        return this.openPopup(`${this.tabUrl}/${pathMap.requestNewDeviceData}`, {
            method: EnumRequestMethods.REQUEST_NEW_DEVICE_DATA,
            params: {},
        });
    }
    requestDeviceData() {
        return this.openPopup(`${this.tabUrl}/${pathMap.requestDeviceData}`, {
            method: EnumRequestMethods.REQUEST_DEVICE_DATA,
            params: {},
        });
    }
    requestSignData(data) {
        return this.openPopup(`${this.tabUrl}/${pathMap.requestSignData}`, {
            method: EnumRequestMethods.REQUEST_SIGN_DATA,
            params: data,
        });
    }
    requestDeviceSignData(data) {
        return this.openPopup(`${this.tabUrl}/${pathMap.requestDeviceSignData}`, {
            method: EnumRequestMethods.REQUEST_DEVICE_SIGN_DATA,
            params: {
                msg: data.msg,
                haveDeviceData: true,
            },
        });
    }
    requestRecoverDeviceData() {
        return this.openPopup(`${this.tabUrl}/${pathMap.requestRecoverDeviceData}`, {
            method: EnumRequestMethods.REQUEST_RECOVER_DEVICE_DATA,
            params: {},
        });
    }
    requestBackupData(data) {
        let url = "";
        if (data.isOpen) {
            this.open(`${this.tabUrl}/${pathMap.requestBackupData}`, {
                method: EnumRequestMethods.REQUEST_BACKUP_DATA,
                isInternal: true,
                params: data,
            }, true, false);
        }
        else {
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
    requestWaitingPage(onError) {
        return this.openPopupWithWaiting(`${this.tabUrl}/${pathMap.requestWaitingPage}`, {
            method: EnumRequestMethods.REQUEST_WAITING_PAGE,
            params: {},
        }, onError);
    }
}
//# sourceMappingURL=index.js.map