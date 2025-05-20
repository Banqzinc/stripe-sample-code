require("dotenv").config();
const env = require("env-var");

module.exports = {
	CONFIG: {
		isDev:
			env.get("NODE_ENV").default("production").asString() === "development",
		port: env.get("PORT").default("3000").asInt(),
		stripeSecretKey: env.get("STRIPE_SECRET_KEY").required().asString(),
		quidkeyClientId: env.get("QK_CLIENT_ID").required().asString(),
		quidkeyClientSecret: env.get("QK_CLIENT_SECRET").required().asString(),
		quidkeyApiBase: env.get("QK_API_BASE").required().asString(),
		domain: env.get("DOMAIN").required().asString(),
	},
};
