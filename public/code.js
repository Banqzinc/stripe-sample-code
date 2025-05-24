const stripePublishableKey =
	"pk_test_51N448BBY03jTxzpG6n5YQlcLJfeIijwZs00h8pCUtlejBXSnEf13j0cf5ISSf0b7pL7rRWzDVPFRrCczw8A7Vnki00Cefk3jwj";

const QuidkeyEndpoints = {
	CREATE_PAYMENT_INTENT_URL: "/create-checkout-session",
};

const returnUrl = window.location.href; // or a specific thank you page

// fetch configuration from server
async function loadConfig() {
	try {
		const response = await fetch("/config");
		const config = await response.json();

		return config;
	} catch (error) {
		console.error("Error loading configuration:", error);

		return {
			domain: "http://localhost:5682",
			qkApiBase: "http://localhost:5679/",
		};
	}
}

const purchaseButton = document.getElementById("purchase-button");
const quidkeyIframe = document.getElementById("quidkey-iframe");
const qkFrameContainer = document.getElementsByClassName(
	"quidkey-element-container",
)[0];
const stripeContainer = document.getElementById("stripe-element-container");
const paymentMessage = document.getElementById("payment-message");

let stripe = undefined;
let elements = undefined;
let paymentElement = undefined;
let quidkeyOrigin = undefined; // <--- store origin for security
let quidkeyPaymentToken = null; // <--- store paymentToken for later use
// --- State to track selection ---
let currentSelection = { source: "quidkey", method: null };
console.log("[Merchant] Initial selection state:", currentSelection);

purchaseButton.disabled = true; // Disabled until iframe tells us the bank

async function initializeStripe() {
	try {
		const config = await loadConfig();

		// Quidkey stuff
		const { clientSecret, paymentToken } = await fetch(
			QuidkeyEndpoints.CREATE_PAYMENT_INTENT_URL,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "customer@example.com" }),
			},
		).then((r) => r.json());

		if (!clientSecret) {
			throw new Error("Failed to retrieve client secret from server.");
		}

		if (paymentToken) {
			quidkeyPaymentToken = paymentToken;
			const iframe = document.getElementById("quidkey-iframe");
			iframe.src = `${config.qkApiBase}/api/v1/embedded?payment_token=${paymentToken}`;
			quidkeyOrigin = new URL(iframe.src).origin;
		}
		// end-of Quidkey stuff

		// biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
		stripe = Stripe(stripePublishableKey);

		elements = stripe.elements({
			appearance: { theme: "stripe" },
			clientSecret,
		});

		const paymentElementOptions = {
			layout: {
				type: "accordion",
				defaultCollapsed: true,
				radios: true,
				spacedAccordionItems: false,
			},
		};
		paymentElement = elements.create("payment", paymentElementOptions);
		paymentElement.mount("#payment-element");

		paymentElement.on("change", handlePaymentElementChange);
		paymentElement.on("focus", handlePaymentElementFocus);
	} catch (error) {
		console.error("[Merchant] Error initializing Stripe:", error);
		showMessage(`Stripe initialization failed: ${error.message}`);

		stripeContainer.innerHTML = "<p>Could not load payment options.</p>";
	}
}

function showMessage(messageText) {
	paymentMessage.classList.remove("hidden");
	paymentMessage.textContent = messageText;

	setTimeout(() => {
		paymentMessage.classList.add("hidden");
		paymentMessage.textContent = "";
	}, 10000);
}

function handlePaymentElementChange(event) {
	console.log("[Merchant] Stripe PaymentElement change event:", event);

	if (!event.collapsed) {
		// stripe payment method has been selected
		quidkeyIframe.contentWindow.postMessage(
			{ type: "quidkey-clear-selection" },
			"*",
		);

		currentSelection = {
			source: "stripe",
			method: event.value?.type || null,
		};
		purchaseButton.disabled = !event.complete; // enable only when complete
	}
}

// cleaned
function handlePaymentElementFocus() {
	console.log("[Merchant] Stripe PaymentElement focused.");

	if (currentSelection.source !== "stripe") {
		console.log("[Merchant] Switching selection to Stripe on focus.");

		qkFrameContainer?.classList.remove("quidkey-bank-set-open");
		currentSelection = { source: "stripe", method: null };
		purchaseButton.disabled = true;

		if (quidkeyIframe && quidkeyIframe.contentWindow) {
			quidkeyIframe.contentWindow.postMessage(
				{ type: "quidkey-unselect" },
				"*",
			);
		}

		console.log("[Merchant] New selection state:", currentSelection);
	}
}

purchaseButton.addEventListener("click", async () => {
	console.log(
		"[Merchant] Purchase button clicked. Current selection:",
		currentSelection,
	);

	purchaseButton.disabled = true;

	if (currentSelection.source === "stripe") {
		// Stripe sample code
		if (!stripe || !elements) {
			console.error("[Merchant] Stripe.js or Elements not initialized.");
			showMessage("Payment system error. Please refresh.");
			return; // Stripe not ready
		}

		console.log("[Merchant] Confirming Stripe payment.");
		// Use stripe.confirmPayment directly
		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: returnUrl,
			},
		});

		if (error) {
			if (error.type === "card_error" || error.type === "validation_error") {
				showMessage(error.message);
			} else {
				showMessage("An unexpected error occurred.");
			}
			purchaseButton.disabled = false;
		} else {
			showMessage("Processing payment...");
		}
	} else if (currentSelection.source === "quidkey") {
		// Quidkey stuff
		console.log(
			`[Merchant] Proceeding with QuidKey payment method: ${currentSelection.method}`,
		);

		if (!quidkeyPaymentToken) {
			showMessage("Payment system error. Missing token.");
			purchaseButton.disabled = false;
			return;
		}

		try {
			const resp = await fetch("/quidkey/payment-initiation", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					bankId: currentSelection.method,
					paymentToken: quidkeyPaymentToken,
				}),
			}).then((r) => r.json());

			if (resp.success && resp.payment_link) {
				window.location.href = resp.payment_link; // 🔀 redirect to bank
			} else {
				console.error("[Merchant] Quidkey initiation failed:", resp);
				showMessage(resp.error?.message || "Unable to initiate payment.");
				purchaseButton.disabled = false;
			}
		} catch (err) {
			console.error(
				"[Merchant] Network / server error during Quidkey initiation:",
				err,
			);
			showMessage("Network error while initiating payment.");
			purchaseButton.disabled = false;
		}
	}
});

const quidkeyFrameContainer = document.getElementsByClassName(
	"quidkey-element-container",
)[0];

window.addEventListener("message", (event) => {
	// ignore non-Quidkey messages
	if (
		!quidkeyOrigin ||
		event.origin !== quidkeyOrigin ||
		event.data.type !== "quidkey-state-update"
	)
		return;

	// close stripe if bank is selected
	if (event.data.isListOpen || event.data.isPredictedBankSelected) {
		// collapse stripe so nothing selected
		if (paymentElement) {
			paymentElement.collapse();
		}
	}

	// update styles to fit the bank set
	switch (event.data.isListOpen) {
		case true:
			quidkeyFrameContainer.classList.add("quidkey-bank-set-open");
			purchaseButton.disabled = true;
			break;
		case false:
			quidkeyFrameContainer.classList.remove("quidkey-bank-set-open");
			break;
	}

	// update currentSelection based on the selected bank
	const selectedBankId = event.data.selectedBankId;

	if (selectedBankId) {
		currentSelection = {
			source: "quidkey",
			method: event.data.selectedBankId,
		};

		purchaseButton.disabled = false;
	}
});

initializeStripe();
