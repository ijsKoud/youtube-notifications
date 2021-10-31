<h1 align="center">@daangamesdg/youtube-notifications</h1>

The TypeScript compatible version of [youtube-notification](https://www.npmjs.com/package/youtube-notification).
Full credits go to them as I only bumped the dependencies and added TypeScript declarations to the code.

## Install

```sh
# npm install @daangamesdg/youtube-notifications
yarn add @daangamesdg/youtube-notifications
```

## Usage

JavaScript example:

```js
const { Notifier } = require("@daangamesdg/youtube-notifications");

const notifier = new Notifier({
	hubCallback: "https://example.com/youtube",
	port: 8080,
	secret: "Something",
	path: "/youtube",
});
notifier.setup();

notifier.on("notified", (data) => {
	console.log("New Video");
	console.log(`${data.channel.name} just uploaded a new video titled: ${data.video.title}`);
});

notifier.subscribe("channel_1");
```

TypeScript example:

```ts
import { Notifier } from "@daangamesdg/youtube-notifications";

const notifier = new Notifier({
	hubCallback: "https://example.com/youtube",
	port: 8080,
	secret: "Something",
	path: "/youtube",
});

notifier.setup();

notifier.on("notified", (data) => {
	console.log("New Video");
	console.log(`${data.channel.name} just uploaded a new video titled: ${data.video.title}`);
});

notifier.subscribe("channel_1");
```

## Events

- **'subscribe'** - Emitted when a new subscription is added.
- **'unsubscribe'** - Emitted when a subscription is removed.
- **'notified'**([_data_](#types)) - Emitted when a new video is uploaded.

## API

### YouTubeNotifier.constructor(_options_)

_options_ is an object that you may write your own properties to.
The following properties are read by YouTubeNotifier:

- **secret** - A private key used by Pubsubhubbub, it is not required to include this property but it is highly recommended that you do. Defaults to _undefined_
- **hubCallback** - Your ip/domain name that will be used as a callback URL by Pubsubhubbub. It _must_ be in a URL format, _ex: 'https://example.com/'_. This is a **required** property as the default is undefined.
- **middleware** - If you are going to use the notifier with a middle ware. Defaults to _false_.
- **path** - The path on which the server will interact with the hub. Defaults to _'/'_. Not required if you are using the notifier with a middleware.
- **port** - The port Pubsubhubbub will listen on. This must be an open port on your system. Defaults to port _3000_. Not required if you are using the notifier with a middleware.
- **hubUrl** - The URL in which we listen to updates from. This shouldn't be changed unless you know what you're doing.

### YouTubeWatch.setup()

This function will setup a server to interact with Pubsubhubbub. If this function is called after the server has already been setup an error is thrown. If this is used with middleware set to true, an error is thrown.

### YouTubeWatch.listener()

This functions will creates and return an Express middleware handler for PubSubHubbub.

### YouTubeWatch.subscribe(channels=[])

Subscribes to a channel or a list of channels IDs. Channels may either be a string or an array of strings. After each successful channel has been verified to receive updates a _subscribe_ event is ommited.

### YouTubeWatch.unsubscribe(channels=[])

Removes the watch state from a list of channel IDs. Channels may either be a string or an array of strings. After each successful channel has been verified to stop receiving updates an _unsubscribe_ event is ommited.

## Types

```ts
export type NotifierOptions = {
	hubCallback: string;
	secret?: string;
	middleware?: boolean;
	port?: number;
	path?: string;
	hubUrl?: string;
};

export interface Notification {
	video: {
		id: string;
		title: string;
		link: string;
	};
	channel: {
		id: string;
		name: string;
		link: string;
	};
	published: Date;
	updated: Date;
}

export interface SubscriptionUpdate {
	type: "subscribe" | "unsubscribe";
	channel: string;
}
```

## Author

👤 **DaanGamesDG**

- Website: https://daangamesdg.wtf/
- Email: <daan@daangamesdg.wtf>
- Twitter: [@DaanGamesDG](https://twitter.com/DaanGamesDG)
- Github: [@DaanGamesDG](https://github.com/DaanGamesDG)

## Donate

This will always be open source project, even if I don"t receive donations. But there are still people out there that want to donate, so if you do here is the link [PayPal](https://paypal.me/daangamesdg) or [Ko-Fi](https://daangamesdg.wtf/kofi). Thanks in advance! I really appriciate it <3

## Lisence

Project is licensed under the © [**MIT License**](/LICENSE)

---
