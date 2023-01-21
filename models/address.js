const mongoose = require("mongoose");
const Schema = require("mongoose").Schema;

const AddressSchema = Schema(
	{
    zip_code: { type: Number, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    number: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Address", AddressSchema);
