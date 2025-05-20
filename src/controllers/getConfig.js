const { CONFIG } = require("../config");

module.exports = {
	getConfig: async (_, res) =>
		res.json({
			domain: CONFIG.domain,
			qkApiBase: CONFIG.quidkeyApiBase,
		}),
};
