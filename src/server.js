const express = require("express");
const cors = require("cors");
const app = express();
const { CONFIG } = require("./config");
const { logger } = require("@mv-d/toolbelt");
const { getConfig } = require("./controllers/getConfig");
const { getStatic } = require("./controllers/getStatic");
const {
	createCheckoutSession,
} = require("./controllers/createCheckoutSession");
const { getSessionStatus } = require("./controllers/getSessionStatus");
const { paymentInitiation } = require("./controllers/paymentInitiation");

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.get("/", getStatic);
app.get("/config", getConfig);
app.post("/create-checkout-session", createCheckoutSession);
app.get("/session-status", getSessionStatus);
app.post("/quidkey/payment-initiation", paymentInitiation);

app.listen(CONFIG.port, () => {
	logger.info(`Running on port ${CONFIG.port}`);
	logger.info(`Open demo page at ${CONFIG.domain}`);
});
