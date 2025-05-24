const { initiateEmbeddedPayment } = require("../client");

module.exports = {
	paymentInitiation: async (req, res) => {
		try {
			const { bankId, paymentToken } = req.body;
			if (!bankId || !paymentToken) {
				return res.status(400).send({
					error: { message: "bankId and paymentToken are required" },
				});
			}

			const payment_link = await initiateEmbeddedPayment(bankId, paymentToken);
			res.send({ success: true, payment_link });
		} catch (err) {
			console.error("[Server] Error during Quidkey payment initiation:", err);
			res.status(500).send({
				success: false,
				error: { message: err.message || "Internal error" },
			});
		}
	},
};
