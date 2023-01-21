"use strict";

const DbMixin = require("../mixins/db.mixin");
const Address = require("../models/address");

module.exports = {
  name: "address",

  mixins: [DbMixin("address")],

  model: Address,

  settings: {
    fields: [
      "_id",
      "zip_code",
      "country",
      "city",
      "street",
      "number",
      "userId",
    ],

    entityValidator: {
      zip_code: {
        type: "number",
        min: 4,
      },
      country: {
        type: "string",
      },
      city: {
        type: "string",
      },
      street: {
        type: "string",
      },
      number: {
        type: "number",
      },
    },
  },

  actions: {
    count: false,
    insert: false,
    find: false,
    list: false,
    /** Use default create, get, update, remove */

    /**
     * Return a list of addresses by a specific user
     * @param {string} userId
     * @returns {(Address[]|[])}
     */
    lisByUserId: {
      params: {
        userId: { type: "string" },
      },
      async handler(ctx) {
        return Address.find({ userId: ctx.params.userId }).then((docs) =>
          this.transformDocuments(ctx, ctx.params, docs)
        );
      },
    },

    removeByUserId: {
      params: {
        userId: { type: "string" },
      },
      async handler(ctx) {
        const { userId } = ctx.params;
        const addresses = await Address.deleteMany({ userId: userId });
        return addresses;
      },
    },
  },

  methods: {},
};
