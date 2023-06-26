<h1 align="center">Connect-DID SDK</h2>
<p align="center">An npm package that connects to the Connect DID Authorization Center, enabling any hardware device to become a DID identity authentication device, offering a secure and convenient method of identity verification.</p>
<div align="center">

![NPM](https://img.shields.io/npm/l/connect-did-sdk) ![npm](https://img.shields.io/npm/v/connect-did-sdk)
</div>

## Table of Contents
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [CHANGELOG](#changelog)
- [FAQ](#faq)
- [Get Help](#get-help)
- [Contribute](#contribute)
- [License](#license)

## Getting Started

First, you need to install `connect-did-sdk` using [`npm`](https://www.npmjs.com/package/connect-did-sdk)
```bash
npm install connect-did-sdk --save
```
or [`yarn`](https://yarnpkg.com/package/connect-did-sdk).
```bash
yarn add connect-did-sdk
```

Then, you need to import Connect-DID SDK in your code and create an instance before interacting with it:
```ts
// For CommonJS
const { ConnectDID } = require('connect-did-sdk');
const connectDID = new ConnectDID();
```

```ts
// For ES Module
import { ConnectDID } from 'connect-did-sdk'
const connectDID = new ConnectDID()
```

Now you could perform various operations using Connect-DID SDK. 

## CHANGELOG
TBD

## API Documentation
### Table of Contents
- [constructor(isProdData?: boolean)](#constructorisproddata-boolean)
- [requestNewDeviceData()](#requestnewdevicedata)
- [requestDeviceData()](#requestdevicedata)
- [requestSignData(data: {msg: string})](#requestsigndatadata-msg-string)
- [requestRecoverDeviceData()](#requestrecoverdevicedata)
- [requestBackupData(data: {ckbAddr: string;isOpen?: boolean;})](#requestbackupdatadata-ckbaddr-stringisopen-boolean)
- [deserializedData(data: any, enc?: string)](#deserializeddatadata-any-enc-string))

#### constructor(isProdData?: boolean)
Create an instance of ConectDID SDK.
##### Parameter
- `isProdData`: network type. default `true`.
  - `true`: Main Net
  - `false`: Test Net.
##### Return Value
ConnectDID instance

##### Example
```ts
const connectDID = new ConnectDID();
```

#### requestNewDeviceData()
Popup to open a new device credential.
##### Parameter
N/A
##### Return Value
Device Data
```ts
interface IData<IDeviceData> {
    code: number;
    msg: string;
    data: IDeviceData;
}

interface IDeviceData {
  name: string;
  credential: ICredential;
  publicKey: IPublicKey;
  ckbAddr: string;
}
```

##### Example
```ts
const deviceData = await connectDID.requestNewDeviceData();
```

#### requestDeviceData()
Popup to open a connection window for the current device.
##### Parameter
N/A
##### Return Value
Device Data
```ts
interface IData<IDeviceData> {
    code: number;
    msg: string;
    data: IDeviceData;
}

interface IDeviceData {
  name: string;
  credential: ICredential;
  publicKey: IPublicKey;
  ckbAddr: string;
}
```

##### Example
```ts
const deviceData = await connectDID.requestDeviceData();
```

#### requestSignData(data: {msg: string})
Popup to open a window for signing a specified string data using the current hardware device authenticator.
##### Parameter
- `data`: 
  - `msg`: String to be signed.

##### Return Value
Signed hexadecimal string.
```ts
interface IData<string> {
    code: number;
    msg: string;
    data: string;
}
```

##### Example
```ts
const signData = await connectDID.requestSignData({
  msg: "From .bit: e7343fdebaa9ec5aca009af3acb9c0664c94066f136f4d31b7b325dacf24f77c",
});
```

#### requestRecoverDeviceData()
Popup to guide the user in recovering locally stored data that has been cleared due to clearing browser cache.
##### Parameter
N/A
##### Return Value
Device Data
```ts
interface IData<IDeviceData> {
    code: number;
    msg: string;
    data: IDeviceData;
}

interface IDeviceData {
  name: string;
  credential: ICredential;
  publicKey: IPublicKey;
  ckbAddr: string;
}
```
##### Example
```ts
const result = await connectDID.requestRecoverDeviceData();
```

#### requestBackupData(data: {ckbAddr: string;isOpen?: boolean;})
Popup to guide the user in performing multi-device backup.
##### Parameter
- `isOpen`: `boolean` Whether to directly open the backup operation popup. default `true`. If set to `false`, it will return the URL of the backup page.
-  `ckbAddr`: `string` CKB address of the old device for the purpose of backup on a new device.

##### Return Value
URL string

##### Example
```ts
const url = await tabCaller.requestBackupData({
  isOpen: false,
  ckbAddr: "ckt1qqexmutxu0c2jq9q4msy8cc6fh4q7q02xvr7dc347zw3ks3qka0m6qggqus2789zvyms45khp275rfgz5lvcl09e9yyqwg90rj3xzdc26tts402p55p20kv0hjujjjhadjy",
});
```

#### deserializedData(data: any, enc?: string)
Decode the specified formatted data.
##### Parameter
- `data`: `Buffer`
- `enc`: `string` Buffer encoding format. default `'hex'`.

##### Return Value
Decoded data.
##### Example
```ts
const result = tabCaller.deserializedData("a4646e616d65724368726f6d652d646f746269742d3036")
```

## FAQ
TBA

## Get Help
If you have questions or need help with Connect-DID SDK, there are several ways to get assistance:
- Join the .bit community on [Discord channel](https://discord.gg/fVppR7z4ht).
- File [issues](https://github.com/dotbitHQ/connect-did-sdk/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) on the GitHub repository for Connect-DID SDK.

## Contribute
We welcome contributions to Connect-DID SDK! If you are interested in helping to improve the project, there are several ways you can contribute:
- Report bugs or suggest improvements by opening an [issue](https://github.com/dotbitHQ/connect-did-sdk/issues) on the GitHub repository.
- Submit a pull request with your changes to the code.

Please note that Connect-DID SDK is still under development, so any contribution (including pull requests) is welcome.

## License
Connect-DID SDK (including **all** dependencies) is protected under the [MIT License](LICENSE). This means that you are free to use, modify, and distribute the software as long as you include the original copyright and license notice. Please refer to the license for the full terms.
