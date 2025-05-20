const { logger } = require("@mv-d/toolbelt");
const { Err, Ok } = require("@mv-d/toolbelt/dist/tools/monad.tools");
const undici = require("undici");

module.exports = {
	request: async (url, args) => {
		try {
			const response = await undici.request(url, args);
			const body = await response.body.text();
			const json = JSON.parse(body);

			return Ok({
				status: response.statusCode,
				body: json,
			});
		} catch (err) {
			logger.error(err, `[Request] Error: ${args.method.toUpperCase()} ${url}`);
			return Err(err);
		}
	},
};
