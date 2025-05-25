const { logger } = require("@mv-d/toolbelt");
const { createEmbeddedPaymentRequest } = require("../client");
const { Stripe } = require("../utils/stripe");
const { CONFIG } = require("../config");

module.exports = {
	createCheckoutSession: async (req, res) => {
		const { email } = req.body;

		if (!email) {
			logger.error(
				new Error('Missing "email" in body'),
				"[Client] Error: Email is required in the request body.",
			);
			return res.status(400).send({ error: { message: "Email is required" } });
		}

		let customer = null;

		console.log(`[Client] Looking for customer with email: ${email}`);
		try {
			const existingStripeCustomers = await Stripe.customers.list({
				email: email,
				limit: 1,
			});

			if (existingStripeCustomers.data.length > 0) {
				customer = existingStripeCustomers.data[0];
				console.log(`[Client] Found existing Stripe customer: ${customer.id}`);
			} else {
				console.log(
					`[Client] Creating new Stripe customer for email: ${email}`,
				);
				customer = await Stripe.customers.create({
					email: email,
				});
				console.log(`[Client] Created new Stripe customer: ${customer.id}`);
			}
		} catch (error) {
			const message = "Error during customer search/creation";
			logger.error(error, message);
			res.status(500).send({ error, message });
		}

		// Stub order data – in real app derive from basket
		const order = {
			customerName: "John Doe",
			email: email,
			phone: "+351960306447",
			country: "PT",
			orderId: `ORD-${Date.now()}`,
			amount: 100,
			currency: "EUR",
			reference: "Going to Barcelona",
		};

		// Create Quidkey payment request
		const paymentToken = await createEmbeddedPaymentRequest(order);

		console.log("[Client] Creating payment intent for customer...");
		try {
			const paymentIntent = await Stripe.paymentIntents.create({
				amount: 100,
				currency: "eur",
				customer: customer.id,
				automatic_payment_methods: {
					enabled: true,
				},
			});

			console.log(
				`[Client] Payment intent created successfully. Client Secret: ${CONFIG.isDev ? paymentIntent.client_secret : "[PRESENT]"}`,
			);

			res.send({ clientSecret: paymentIntent.client_secret, paymentToken });
		} catch (error) {
			const message = "Error during payment intent creation";
			logger.error(error, message);
			res.status(500).send({ error, message });
		}
	},
};
