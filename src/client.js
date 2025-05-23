const { logger } = require("@mv-d/toolbelt");
const { CONFIG } = require("./config");
const { QuidkeyEndpoints } = require("./constants");
const { request } = require("./utils/request");
// const { request } = require("undici");

let tokenCache = { access_token: null, exp: 0 };

async function getBearer() {
	const now = Date.now() / 1000;

	if (tokenCache.access_token && tokenCache.exp - 30 > now)
		return tokenCache.access_token;

	const result = await request(`${CONFIG.quidkeyApiBase}/api/v1/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: CONFIG.quidkeyClientId,
			client_secret: CONFIG.quidkeyClientSecret,
		}),
	});

	if (result.isErr)
		return logger.error(
			result.unwrapErr(),
			"[Client] Error getting bearer token",
		);

	const { body } = result.unwrap();

	const { access_token, expires_in } = body.data;

	tokenCache = { access_token, exp: now + expires_in };

	console.log(
		`[Client] Token: ${CONFIG.isDev ? tokenCache.access_token : "[PRESENT]"}`,
	);
	console.log(`[Client] Token cached for ${expires_in} seconds`);

	return tokenCache.access_token;
}

async function createEmbeddedPaymentRequest(order) {
	const bearer = await getBearer();

	const data = {
		customer: {
			name: order.customerName,
			email: order.email,
			phone: order.phone,
			country: order.country,
		},
		order: {
			order_id: order.orderId,
			amount: order.amount,
			currency: order.currency,
			payment_reference: order.reference,
			locale: "en-GB",
			test_transaction: true,
		},
		redirect_urls: {
			success_url: `https://www.google.com/search?q=success`,
			failure_url: `https://www.google.com/search?q=failure`,
		},
	};

	const result = await request(
		`${CONFIG.quidkeyApiBase}${QuidkeyEndpoints.PAYMENT_REQUESTS}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${bearer}`,
			},
			body: JSON.stringify(data),
		},
	);

	if (result.isErr)
		return logger.error(
			result.unwrapErr(),
			"[Client] Error sending payment request",
		);

	const { body } = result.unwrap();

	const { payment_token } = body.data;

	console.log(
		`[Client] Payment response: ${CONFIG.isDev ? JSON.stringify(body.data) : "[PRESENT]"}`,
	);
	console.log(
		`[Client] Payment request created: ${CONFIG.isDev ? payment_token : "[PRESENT]"}`,
	);

	return payment_token;
}

async function initiateEmbeddedPayment(bankId, paymentToken) {
	const url = `${CONFIG.quidkeyApiBase}${QuidkeyEndpoints.PAYMENT_INITIATION}?payment_token=${encodeURIComponent(
		paymentToken,
	)}`;

	const result = await request(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ bankId }),
	});

	if (result.isErr)
		return logger.error(
			result.unwrapErr(),
			"[Client] Error sending payment request",
		);

	const { body } = result.unwrap();
	console.dir(body, { depth: null });

	if (!body.success)
		throw new Error(result.error?.message || "Unknown Quidkey error");

	const { payment_link } = body.data;

	return payment_link;
}

module.exports = { createEmbeddedPaymentRequest, initiateEmbeddedPayment };
