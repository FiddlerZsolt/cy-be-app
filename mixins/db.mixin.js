"use strict";

const fs = require("fs");
const DbService = require("moleculer-db");

/**
 * @typedef {import('moleculer').ServiceSchema} ServiceSchema Moleculer's Service Schema
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('moleculer-db').MoleculerDB} MoleculerDB  Moleculer's DB Service Schema
 */

module.exports = function (collection) {
	const cacheCleanEventName = `cache.clean.${collection}`;

	/** @type {MoleculerDB & ServiceSchema} */
	const schema = {
		mixins: [DbService],

		events: {
			async [cacheCleanEventName]() {
				if (this.broker.cacher) {
					await this.broker.cacher.clean(`${this.fullName}.*`);
				}
			},
		},

		methods: {
			/**
			 * Send a cache clearing event when an entity changed.
			 */
			async entityChanged(type, json, ctx) {
				ctx.broadcast(cacheCleanEventName);
			},
		},
	};

  const MongooseAdapter = require("moleculer-db-adapter-mongoose");
  const mongoose = require("mongoose");

  schema.adapter = new MongooseAdapter(process.env.MONGO_URI);
  schema.collection = collection;
  mongoose.set("debug", true);

	return schema;
};
