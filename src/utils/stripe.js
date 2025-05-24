const stripe = require("stripe");
const { CONFIG } = require("../config");

module.exports = {
	Stripe: stripe(CONFIG.stripeSecretKey),
};
