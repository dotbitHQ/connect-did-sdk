import { encode, decode } from "cbor-web";
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
    EnumRequestMethods["REQUEST_CKB_ADDR_LIST"] = "requestCKBAddrList";
    EnumRequestMethods["REQUEST_SIGN_DATA"] = "requestSignData";
    EnumRequestMethods["REQUEST_RECOVER_DEVICE_DATA"] = "requestRecoverDeviceData";
    EnumRequestMethods["REQUEST_DEVICE_DATA"] = "requestDeviceData";
    EnumRequestMethods["REQUEST_BACKUP_DATA"] = "requestBackupData";
})(EnumRequestMethods || (EnumRequestMethods = {}));
export var EnumResponseMethods;
(function (EnumResponseMethods) {
    EnumResponseMethods["RESPONSE_NEW_DEVICE_DATA"] = "responseNewDeviceData";
    EnumResponseMethods["RESPONSE_CKB_ADDR_LIST"] = "responseCKBAddrList";
    EnumResponseMethods["RESPONSE_SIGN_DATA"] = "responseSignData";
    EnumResponseMethods["RESPONSE_RECOVER_DEVICE_DATA"] = "responseRecoverDeviceData";
    EnumResponseMethods["RESPONSE_DEVICE_DATA"] = "responseDeviceData";
})(EnumResponseMethods || (EnumResponseMethods = {}));
class ConnectDIDError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.message = message;
    }
}
export class ConnectDID {
    constructor(isTestNet = false) {
        this.serviceID = "DeviceAuthServiceIframe";
        this.TAB_EVENT = "TabCallBack";
        this.tabUrl = isTestNet
            ? "https://test-connect.did.id"
            : "https://connect.did.id";
    }
    serializedData(data) {
        return encode(data).toString("hex");
    }
    deserializedData(data, enc = "hex") {
        return decode(data, enc);
    }
    decodeQRCode(str) {
        if (!str)
            return "";
        try {
            return window.atob(str);
        }
        catch (e) {
            throw new ConnectDIDError(ActionErrorCode.UNKNOWN, "unknown error");
        }
    }
    open(origin, prams, isNewTab) {
        const width = 860;
        const height = 780;
        const left = (globalThis.innerWidth - width) / 2;
        const top = (globalThis.innerHeight - height) / 2;
        const hash = this.serializedData({
            ...prams,
            originUrl: globalThis.location.origin,
        });
        try {
            globalThis.open(`${origin}#${hash}`, "", !isNewTab
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
    postMessage(origin, params) {
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
        return this.postMessage(`${this.tabUrl}/create-passkey`, {
            method: EnumRequestMethods.REQUEST_NEW_DEVICE_DATA,
            params: {},
        });
    }
    requestDeviceData() {
        return this.postMessage(`${this.tabUrl}/login`, {
            method: EnumRequestMethods.REQUEST_DEVICE_DATA,
            params: {},
        });
    }
    requestSignData(data) {
        return this.postMessage(`${this.tabUrl}/sign-data`, {
            method: EnumRequestMethods.REQUEST_SIGN_DATA,
            params: data,
        });
    }
    requestRecoverDeviceData() {
        return this.postMessage(`${this.tabUrl}/recover-passkey`, {
            method: EnumRequestMethods.REQUEST_RECOVER_DEVICE_DATA,
            params: {},
        });
    }
    requestBackupData(data) {
        let url = "";
        if (data.isOpen) {
            this.open(`${this.tabUrl}/backup`, {
                method: EnumRequestMethods.REQUEST_BACKUP_DATA,
                isInternal: true,
                params: data,
            }, true);
        }
        else {
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
//# sourceMappingURL=index.js.map