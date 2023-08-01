"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectDID = exports.EnumResponseMethods = exports.EnumRequestMethods = exports.ActionErrorCode = void 0;
const cbor_web_1 = require("cbor-web");
var ActionErrorCode;
(function (ActionErrorCode) {
    ActionErrorCode[ActionErrorCode["ABORT"] = 1000] = "ABORT";
    ActionErrorCode[ActionErrorCode["NOT_FOUND"] = 3001] = "NOT_FOUND";
    ActionErrorCode[ActionErrorCode["NOT_EXIST"] = 3002] = "NOT_EXIST";
    ActionErrorCode[ActionErrorCode["ERROR"] = 5000] = "ERROR";
    ActionErrorCode[ActionErrorCode["UNKNOWN"] = 9999] = "UNKNOWN";
    ActionErrorCode[ActionErrorCode["SUCCESS"] = 2000] = "SUCCESS";
})(ActionErrorCode || (exports.ActionErrorCode = ActionErrorCode = {}));
var EnumRequestMethods;
(function (EnumRequestMethods) {
    EnumRequestMethods["REQUEST_NEW_DEVICE_DATA"] = "requestNewDeviceData";
    EnumRequestMethods["REQUEST_SIGN_DATA"] = "requestSignData";
    EnumRequestMethods["REQUEST_RECOVER_DEVICE_DATA"] = "requestRecoverDeviceData";
    EnumRequestMethods["REQUEST_DEVICE_DATA"] = "requestDeviceData";
    EnumRequestMethods["REQUEST_BACKUP_DATA"] = "requestBackupData";
    EnumRequestMethods["REQUEST_WAITING_PAGE"] = "requestWaitingPage";
    EnumRequestMethods["REQUEST_REDIRECT_PAGE"] = "requestRedirectPage";
    EnumRequestMethods["REQUEST_ERROR_PAGE"] = "requestErrorPage";
})(EnumRequestMethods || (exports.EnumRequestMethods = EnumRequestMethods = {}));
var EnumResponseMethods;
(function (EnumResponseMethods) {
    EnumResponseMethods["RESPONSE_NEW_DEVICE_DATA"] = "responseNewDeviceData";
    EnumResponseMethods["RESPONSE_SIGN_DATA"] = "responseSignData";
    EnumResponseMethods["RESPONSE_RECOVER_DEVICE_DATA"] = "responseRecoverDeviceData";
    EnumResponseMethods["RESPONSE_DEVICE_DATA"] = "responseDeviceData";
    EnumResponseMethods["RESPONSE_WAITING_PAGE"] = "responseWaitingPage";
    EnumResponseMethods["RESPONSE_ERROR_PAGE"] = "responseErrorPage";
})(EnumResponseMethods || (exports.EnumResponseMethods = EnumResponseMethods = {}));
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
    "requestBackupData": "backup",
    "requestWaitingPage": "waiting",
    "requestErrorPage": "error",
};
class ConnectDID {
    constructor(isTestNet = false) {
        this.serviceID = "DeviceAuthServiceIframe";
        this.TAB_EVENT = "TabCallBack";
        this.tabUrl = isTestNet
            ? "https://test-connect.did.id"
            : "https://connect.did.id";
    }
    serializedData(data) {
        return (0, cbor_web_1.encode)(data).toString("hex");
    }
    deserializedData(data, enc = "hex") {
        return (0, cbor_web_1.decode)(data, enc);
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
            return globalThis.open(`${origin}#${hash}`, "", !isNewTab
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
        const onWaitingError = (event) => {
            const result = this.messageHandler(event);
            if (result) {
                globalThis.removeEventListener("message", onWaitingError);
                if (result.data.code !== ActionErrorCode.SUCCESS) {
                    popupWindow = null;
                    onError(result.data);
                }
            }
        };
        globalThis.addEventListener("message", onWaitingError);
        let popupWindow = this.open(origin, params);
        const onNext = ({ method, params }) => {
            if (!popupWindow) {
                return Promise.reject({
                    code: ActionErrorCode.ERROR,
                    message: "window is undefined",
                    data: {},
                });
            }
            globalThis.removeEventListener("message", onWaitingError);
            return new Promise((resolve, reject) => {
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
        const onFailed = () => {
            globalThis.removeEventListener("message", onWaitingError);
            if (!popupWindow) {
                console.log("onNext");
                return Promise.reject({
                    code: ActionErrorCode.ERROR,
                    message: "window is undefined",
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
        return {
            onNext,
            onFailed
        };
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
exports.ConnectDID = ConnectDID;
//# sourceMappingURL=index.js.map