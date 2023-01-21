"use strict";

const bcrypt = require("bcrypt");
const hat = require("hat");
const { MoleculerError, MoleculerClientError } = require("moleculer").Errors;
const DbMixin = require("../mixins/db.mixin");
const User = require("../models/user");
const Address = require("../models/address");
const UserWarningError = require("../models/errors/userWarningError");
const { USER, HTTP_STATUS } = require("../models/constants");

module.exports = {
  name: "users",

  mixins: [DbMixin("users")],

  model: User,

  settings: {
    fields: [
      "_id",
      "email",
      "firstName",
      "lastName",
      "addresses",
      "role",
      "status",
    ],

    entityValidator: {
      email: { type: "email" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      password: { type: "string" },
    },

    populates: {
      addresses: "users.list",
    },
  },

  actions: {
    count: false,
    remove: false,
    insert: false,
    find: false,
    create: false,
    get: false,
    list: false,
    update: false,

    /**
     * Create a new user
     * @param {object} user
     * @param {string} deviceId
     * @returns {User} Create and authanticate a new user and return it with api keys
     */
    create: {
      auth: false,
      params: {
        user: {
          type: "object",
        },
        deviceId: {
          type: "string",
        },
      },
      async handler(ctx) {
        const user = new User(ctx.params.user);
        await this.validateEntity(user);

        user.email = user.email.replace(/\.(?=.*?@)|(\+[^\@]+)/g, "");

        if (user.email) {
          const found = await this.adapter.findOne({ email: user.email });
          if (found) {
            throw new MoleculerClientError("Email is exist!", 422, "", [
              { field: "email", message: "is exist" },
            ]);
          }
        }

        user.password = bcrypt.hashSync(user.password, 10);
        user.apiKeys = [
          {
            token: hat(256),
            deviceId: ctx.params.deviceId || "default",
          },
        ];

        try {
          await user.save();
          const response = await this.transformDocuments(ctx, {}, user);
          response.apiKeys = user.apiKeys;
          return response;
        } catch (error) {
          throw new MoleculerError(error.message, 422, "", []);
        }
      },
    },

    /**
     * Get all user
     * @auth required
     * @param {number} pageNumber
     * @param {number} pageSize
     * @returns {(User[]|[])}
     */
    list: {
      pageNumber: {
        type: "number",
        default: 1,
        convert: true,
      },
      pageSize: {
        type: "number",
        default: 10,
      },
      async handler(ctx) {
        if (ctx.meta.user.role != USER.ROLE.ADMIN) {
          throw new UserWarningError(
            "You cannot see users' list",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        const users = await User.find({}).populate(
          "addresses",
          "_id zip_code country city street number"
        );
        const list = await this.transformDocuments(ctx, {}, users);
        return {
          list,
        };
      },
    },

    /**
     * Get user by id
     * @auth required
     * @adminOnly
     * @param {string} id
     * @returns {User}
     */
    get: {
      rest: {
        method: "GET",
        path: "/:id",
      },
      params: {
        id: {
          type: "string",
        },
      },
      async handler(ctx) {
        const { id } = ctx.params;

        if (ctx.meta.user.role != USER.ROLE.ADMIN && id != ctx.meta.user._id) {
          throw new UserWarningError(
            `You cannot see other users`,
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const user = await User.findOne({ _id: id }).populate(
          "addresses",
          "_id zip_code country city street number"
        );

        if (!user) {
          throw new UserWarningError(
            `User not found`,
            HTTP_STATUS.NOT_FOUND.code,
            HTTP_STATUS.NOT_FOUND
          );
        }

        return this.transformDocuments(ctx, {}, user);
      },
    },

    /**
     * Get logged user
     * @auth required
     * @returns {User} - Logged in user profile
     */
    me: {
      rest: "GET /me",
      async handler(ctx) {
        const user = await this.getById(ctx.meta.user._id);
        return this.transformDocuments(ctx, {}, user);
      },
    },

    /**
     * Update user profile
     * @auth required
     * @param {object} user
     * @param {string} user.email
     * @param {string} user.firstName
     * @param {string} user.lastName
     * @param {string} user.password
     * @returns - Updated user profile
     */
    update: {
      rest: {
        method: "PUT",
        path: "/:id",
      },
      params: {
        user: {
          type: "object",
          props: {
            email: {
              type: "email",
              optional: true,
            },
            firstName: {
              type: "string",
              optional: true,
            },
            lastName: {
              type: "string",
              optional: true,
            },
            password: {
              type: "string",
              optional: true,
            },
          },
        },
      },
      async handler(ctx) {
        const { user } = ctx.params;
        const isAdmin = ctx.meta.user.role == USER.ROLE.ADMIN

        // Only admin user can change roles
        if (!isAdmin) {
          delete user.role
        }

        if (
          !isAdmin &&
          ctx.params.id != ctx.meta.user._id
        ) {
          throw new UserWarningError(
            "You cannot delete other users",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        if (user?.password) {
          user.password = bcrypt.hashSync(user.password, 10);
        }

        const updatedUser = await this.adapter.updateById(ctx.params.id, {
          $set: user,
        });

        return this.transformDocuments(ctx, {}, updatedUser);
      },
    },

    /**
     * Delete user
     * @auth required
     * @param {number} id
     * @throws {UserWarningError} if the user is not exists
     * @returns {object} - Success message
     */
    remove: {
      rest: {
        method: "DELETE",
        path: "/:id",
      },
      params: {
        id: {
          type: "string",
        },
      },
      async handler(ctx) {
        const { id } = ctx.params;

        if (ctx.meta.user.role != USER.ROLE.ADMIN && id != ctx.meta.user._id) {
          throw new UserWarningError(
            "You cannot delete other users",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const response = await User.deleteOne({ _id: id });

        if (!response.deletedCount > 0) {
          throw new UserWarningError(
            `User (${id}) not found`,
            HTTP_STATUS.NOT_FOUND.code,
            HTTP_STATUS.NOT_FOUND
          );
        }

        await ctx.call("address.removeByUserId", { userId: id });

        return {
          message: `User (${id}) deleted successfully`,
        };
      },
    },

    /**
     * @param {string} apiKey
     * @returns {User}
     */
    getByApiKey: {
      params: {
        apiKey: {
          type: "string",
        },
      },
      async handler(ctx) {
        const user = await this.adapter.findOne({
          apiKeys: {
            $elemMatch: {
              token: ctx.params.apiKey,
            },
          },
        });
        return user;
      },
    },

    /**
     * Login user with the given data
     * @param {string} email
     * @param {string} password
     * @param {string} [deviceId]
     * @returns {User}
     */
    login: {
      auth: false,
      params: {
        email: {
          type: "email",
        },
        password: {
          type: "string",
        },
        deviceId: {
          type: "string",
          optional: true,
        },
      },
      async handler(ctx) {
        const { email, password } = ctx.params;
        const user = await this.adapter.findOne({ email });
        const errorMessage = "Email or password is wrong";

        if (!user) {
          throw new UserWarningError(errorMessage, HTTP_STATUS.NOT_FOUND.code);
        }

        const passwordMatched = await bcrypt.compare(password, user.password);
        if (!passwordMatched) {
          throw new UserWarningError(
            errorMessage,
            HTTP_STATUS.BAD_REQUEST.code
          );
        }

        // NOTE:
        // Only for testing
        // Create a mock device if the devideId is not exists
        if (!ctx.params.deviceId) {
          const testDevices = ["android", "iphone", "browser"];
          const index = Math.floor(Math.random() * (2 - 0 + 1) + 0);
          ctx.params.deviceId = `${testDevices[index]}-${hat()}`;
        }

        const apiKey = {
          token: hat(256),
          deviceId: ctx.params.deviceId,
        };

        user.apiKeys = [apiKey];
        await user.save();
        const response = await this.transformDocuments(ctx, {}, user);
        return { ...response, apiKeys: [apiKey] };
      },
    },

    /**
     * Logout user
     * Delete users' api key
     * @auth required
     */
    logout: {
      async handler(ctx) {
        const user = await this.getById(ctx.meta.user._id);
        user.apiKeys = [];
        await user.save();

        ctx.meta.$statusMessage = "You are logged out";
      },
    },

    /**
     * Create a new address and add to a specific user
     * @auth required
     * @param {string} userId
     * @param {number} zip_code
     * @param {string} country
     * @param {string} city
     * @param {string} street
     * @param {number} pageNumber
     * @returns {User} with new address
     */
    addAddress: {
      rest: {
        method: "POST",
        path: "/:userId/address",
      },
      params: {
        userId: { type: "string" },
        zip_code: { type: "number" },
        country: { type: "string" },
        city: { type: "string" },
        street: { type: "string" },
        number: { type: "number" },
      },
      async handler(ctx) {
        const user = await this.adapter.findOne({ _id: ctx.params.userId });

        if (
          ctx.meta.user.role != USER.ROLE.ADMIN &&
          ctx.params.userId != ctx.meta.user._id
        ) {
          throw new UserWarningError(
            "You cannot add addresses for other users",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        if (!user) {
          throw new UserWarningError(
            "User is not exists",
            HTTP_STATUS.NOT_FOUND.code,
            HTTP_STATUS.NOT_FOUND
          );
        }

        // Create new address
        const address = await ctx.call("address.create", {
          zip_code: ctx.params.zip_code,
          country: ctx.params.country,
          city: ctx.params.city,
          street: ctx.params.street,
          number: ctx.params.number,
          userId: ctx.params.userId,
        });

        if (!address) {
          throw new UserWarningError(
            "Error while creating new address",
            HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        // Add new address to the requested user
        user.addresses.push(address);
        await user.save();
        return this.transformDocuments(ctx, {}, user);
      },
    },

    /**
     * List the specific users' addresses
     * @auth required
     * @param {string} userId
     * @returns {Array}
     */
    getAddress: {
      rest: {
        method: "GET",
        path: "/:userId/address",
      },
      params: {
        userId: { type: "string" },
      },
      async handler(ctx) {
        const { userId } = ctx.params;

        if (
          ctx.meta.user.role != USER.ROLE.ADMIN &&
          userId != ctx.meta.user._id
        ) {
          throw new UserWarningError(
            "You cannot view other users' addresses",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const addresses = await ctx.call("address.lisByUserId", {
          userId: userId,
        });

        return addresses;
      },
    },

    /**
     * Update an address
     * @param {string} userId
     * @param {string} id - Address _id
     */
    updateAddress: {
      rest: {
        method: "PUT",
        path: "/:userId/address/:id",
      },
      params: {
        userId: { type: "string" },
        id: { type: "string" },
      },
      async handler(ctx) {
        const { id, userId } = ctx.params;
        delete ctx.params.id;

        if (ctx.params.userId) {
          delete ctx.params._id;
        }

        const address = await ctx.call("address.get", { id: id });

        if (!address) {
          throw new UserWarningError(
            HTTP_STATUS.NOT_FOUND.status,
            HTTP_STATUS.NOT_FOUND.code
          );
        }

        if (ctx.meta.user.role != USER.ROLE.ADMIN && userId != address.userId) {
          throw new UserWarningError(
            HTTP_STATUS.BAD_REQUEST.status,
            HTTP_STATUS.BAD_REQUEST.code
          );
        }

        const updatedAddress = { ...address, ...ctx.params, id: address._id };

        return await ctx.call("address.update", updatedAddress);
      },
    },

    /**
     * Delete address
     * @auth required
     * @param {number} userId
     * @param {number} id - Address _id
     * @throws {UserWarningError} if the user is not exists
     * @returns {object} - Success message
     */
    removeAddress: {
      rest: {
        method: "DELETE",
        path: "/:userId/address/:id",
      },
      params: {
        userId: { type: "string" },
        id: { type: "string" },
      },
      async handler(ctx) {
        const { id, userId } = ctx.params;
        const address = await ctx.call("address.get", { id: id });

        if (ctx.meta.user.role != USER.ROLE.ADMIN && userId != address.userId) {
          throw new UserWarningError(
            "You cannot delete other users' addresses",
            HTTP_STATUS.BAD_REQUEST.code,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const user = await User.findOne({ _id: userId });
        user.addresses = user.addresses.filter((addr) => id != addr._id);

        try {
          await ctx.call("address.remove", { id: id });
          await user.save();

          return {
            message: `Address (${id}) deleted successfully`,
          };
        } catch (error) {
          throw new UserWarningError(
            error,
            HTTP_STATUS.INTERNAL_SERVER_ERROR.code
          );
        }
      },
    },
  },

  methods: {
    /**
     * Create an admin user for testing, if the user doc is empty
     */
    async seedUsers(ctx) {
      const count = await this.adapter.count();
      if (count === 0) {
        console.log("\n\n 🚀 Initialize users 🚀 \n\n");

        await this.broker.call("users.create", {
          user: {
            firstName: "Default",
            lastName: "Admin",
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: USER.ROLE.ADMIN,
            status: USER.STATUS.ACTIVE,
          },
          deviceId: "default admin",
        });

        console.log("\n\n 🏁 DONE! 🏁 \n\n");
      }
    },
  },

  started() {
    this.seedUsers();
  },
};
