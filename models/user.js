const mongoose = require("mongoose");
const Schema = require("mongoose").Schema;
const { ApiKeySchema } = require("./apiKey");
const { USER } = require("./constants");

const UserSchema = Schema(
  {
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: Number, default: USER.STATUS.ACTIVE },
    role: { type: Number, default: USER.ROLE.USER },
    apiKeys: { type: [ApiKeySchema], default: [] },
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
