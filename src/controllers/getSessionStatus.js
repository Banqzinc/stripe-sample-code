const { Stripe } = require("../utils/stripe");

module.exports = {
	getSessionStatus: async (req, res) => {
		// This endpoint is now for Payment Intent status, not Checkout Session
		// We'll likely need to adjust the client-side (return.js) later to use this differently
		// or retrieve the PI directly client-side using its client_secret
		const paymentIntent = await Stripe.paymentIntents.retrieve(
			req.query.payment_intent,
		); // Expecting payment_intent query param

		res.send({
			status: paymentIntent.status,
			customer_email: paymentIntent.receipt_email, // Or retrieve from customer object if needed
		});
	},
};
