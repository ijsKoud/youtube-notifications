"use strict";
/**
 * Module dependencies.
 */
const EventEmitter = require("events");
const server = require("./server");
const { post } = require("axios");
const urllib = require("url");
const crypto = require("crypto");
const xmlbodyparser = require("./xmlParser");
const { nanoid } = require("nanoid");

/**
 * Constants
 */
const base_topic = "https://www.youtube.com/xml/feeds/videos.xml?channel_id=";

/**
 * Represents the YouTube Notifier Class
 * @extends {EventEmitter}
 */
module.exports = class Notifier extends EventEmitter {
	/**
	 * @typedef {Object} NotifierOptions
	 * @property {string} hubCallback Your ip/domain name that will be used as a callback URL by the hub
	 * @property {?string} [secret=undefined] The secret for the requests to hub
	 * @property {boolean} [middleware=false] If you are going to use the Notifier with a middleware
	 * @property {?number} [port=3000] An open port on your system to listen on. Defaults to port 3000 or undefined
	 * @property {?string} [path='/'] The path on which server will interact with the hub
	 * @property {?string} [hubUrl='https://pubsubhubbub.appspot.com/'] The hub url. It is advised not to change this.
	 */

	/**
	 *
	 * @constructor
	 * @param {NotifierOptions} [options={}] The options for the notifier
	 */
	constructor(options = {}) {
		if (!options.hubCallback) throw new Error("You need to provide the callback URL.");
		super();

		/**
		 * The options the notifier was instantiated with.
		 *
		 * @name YouTubeNotifier#options
		 * @type {NotifierOptions}
		 */

		/**
		 * The ip/domain name that will be used as a callback URL by the hub
		 *
		 * @type {string}
		 */
		this.hubCallback = options.hubCallback;

		/**
		 * The hub URL
		 *
		 * @type {string}
		 */
		this.hubUrl = options.hubUrl || "https://pubsubhubbub.appspot.com/";

		/**
		 * The secretkey for the requests to hub
		 *
		 * @type {?string}
		 */
		this.secret = options.secret;

		/**
		 * If the notifier will be used with a middleware
		 *
		 * @type {boolean}
		 */
		this.middleware = Boolean(options.middleware);

		/**
		 * The port to listen on
		 *
		 * @type {number}
		 */
		this.port = options.port || 3000;

		/**
		 * The path on which server will interact with the hub
		 *
		 * @type {string}
		 */
		this.path = options.path || "/";

		/**
		 * The server to interact with the hub
		 *
		 * @type {Express|null}
		 */
		this.server = null;

		/**
		 * Array of recieved channels to ignore duplicate update for
		 * @private
		 * @type {string[]}
		 */
		this._recieved = [];

		/**
		 * Secret for unsubscribe and subscribe verification
		 * @private
		 * @type {string}
		 */
		this._subscribeSecet = nanoid(12);
	}

	/**
	 * Create a server and start listening on the port.
	 *
	 * This should not be used if you are using middleware.
	 *
	 */
	setup() {
		if (this.middleware) throw new Error("You cannot setup a server if you are using middleware.");
		if (this.server) throw new Error("The Server has been already setup.");
		this.server = server(this);
		this.server.listen(this.port);
	}

	/**
	 * Creates an Express middleware handler for PubSubHubbub
	 *
	 * @param  {Object}   req HTTP request object
	 * @param  {Object}   res HTTP response object
	 * @return {Function} Middleware handler
	 */
	listener() {
		return (req, res) => {
			xmlbodyparser(req, res, this);
		};
	}

	/**
	 * Subsribe to a channel.
	 *
	 * @param {string[]|string} channels The channel id or an array of channel ids to subscribe to
	 */
	subscribe(channels) {
		if (!channels || (typeof channels !== "string" && !Array.isArray(channels)))
			throw new Error("You need to provide a channel id or an array of channel ids.");

		if (typeof channels === "string") this._makeRequest(channels, "subscribe");
		else channels.forEach((channel) => this._makeRequest(channel, "subscribe"));
	}

	/**
	 * Unsubsribe from a channel.
	 *
	 * @param {string[]|string} channels The channel id or an array of channel ids to unsubscribe from
	 */
	unsubscribe(channels) {
		if (!channels || (typeof channels !== "string" && !Array.isArray(channels)))
			throw new Error("You need to provide a channel id or an array of channel ids.");

		if (typeof channels === "string") this._makeRequest(channels, "unsubscribe");
		else channels.forEach((channel) => this._makeRequest(channel, "unsubscribe"));
	}

	/**
	 * Subsribe or unsubscribe to a channel
	 *
	 * @private
	 * @param {string} channel_id The id of the channel to subscribe or unsubscribe to
	 * @param {string} type Either 'subscribe' or 'unsubscribe'
	 */
	async _makeRequest(channel_id, type) {
		const topic = base_topic + channel_id;
		const data = {
			"hub.callback": this.hubCallback,
			"hub.mode": type,
			"hub.topic": topic,
			"hub.verify_token": this._subscribeSecet,
		};

		if (this.secret) data["hub.secret"] = this.secret;

		await post(this.hubUrl, new urllib.URLSearchParams(data), {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
	}

	/**
	 * Request handler. Will be fired when a hub opens a connection to the server
	 *
	 * @event
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 */
	_onRequest(req, res) {
		if (req.method === "GET") this._onGetRequest(req, res);
		else if (req.method === "POST") this._onPostRequest(req, res);
		else return res.sendStatus(403);
	}

	/**
	 * GET request handler for the server. This should be called when the server
	 * tries to verify the intent of the subscriber.
	 *
	 * @event
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 */
	_onGetRequest(req, res) {
		const params = urllib.parse(req.url, true, true).query;

		if (!params["hub.verify_token"] || params["hub.verify_token"] !== this._subscribeSecet)
			return res.status(401).set("Content-Type", "text/plain").end("Unauthorized request");

		// Invalid request
		if (!params["hub.topic"] || !params["hub.mode"])
			return res.status(400).set("Content-Type", "text/plain").end("Bad Request");

		res.status(200).set("Content-Type", "text/plain").end(params["hub.challenge"]);

		const data = {
			type: params["hub.mode"],
			channel: params["hub.topic"].replace(base_topic, ""),
		};

		// Also return lease_seconds if mode is subscribe
		if (params["hub.lease_seconds"]) data.lease_seconds = params["hub.lease_seconds"];
		this.emit(params["hub.mode"], data);
	}

	/**
	 * POST request handler. Should be called when the hub tries to notify the subscriber
	 * with new data
	 *
	 * @event
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 */
	_onPostRequest(req, res) {
		let signatureParts, algo, signature, hmac;

		// Invalid POST
		if (this.secret && !req.headers["x-hub-signature"]) return res.sendStatus(403);

		// Deleted Video
		if (req.body.feed["at:deleted-entry"]) return res.sendStatus(200);

		let body = req.body.feed.entry;
		if (!body) return res.status(400).set("Content-Type", "text/plain").end("Bad Request");

		body = body[0];
		const { rawBody } = req;

		// Match Secret
		if (this.secret) {
			signatureParts = req.headers["x-hub-signature"].split("=");
			algo = (signatureParts.shift() || "").toLowerCase();
			signature = (signatureParts.pop() || "").toLowerCase();

			try {
				hmac = crypto.createHmac(algo, this.secret);
			} catch (E) {
				return res.sendStatus(403);
			}

			hmac.update(rawBody);

			// Return a 200 response even if secret did not match
			if (hmac.digest("hex").toLowerCase() !== signature) return res.sendStatus(200);
		}

		const vidId = body["yt:videoid"][0];
		const publishTIme = new Date(body.published[0]);
		const updateTime = new Date(body.updated[0]);

		if (this._recieved.includes(vidId)) return res.sendStatus(200);
		this._recieved.push(vidId);

		const data = {
			video: {
				id: vidId,
				title: body.title[0],
				link: body.link[0].$.href,
			},
			channel: {
				id: body["yt:channelid"][0],
				name: body.author[0].name[0],
				link: body.author[0].uri[0],
			},
			published: publishTIme,
			updated: updateTime,
		};

		this.emit("notified", data);

		res.sendStatus(200);
	}
};
