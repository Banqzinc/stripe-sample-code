// This is your test secret API key.
const stripe = Stripe("pk_test_51N448BBY03jTxzpG6n5YQlcLJfeIijwZs00h8pCUtlejBXSnEf13j0cf5ISSf0b7pL7rRWzDVPFRrCczw8A7Vnki00Cefk3jwj");

// Store elements, paymentElement and clientSecret globally within the scope of this script
let elements;
let paymentElementRef; // <-- global reference
let clientSecret;

initialize();

// Fetches a PaymentIntent client secret and initializes Elements
async function initialize() {
  // Fetch client secret
  const response = await fetch("/create-checkout-session", { // We keep the endpoint name for now
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: 'bdr193@gmail.com' }), // Send email to create/find customer
  });
  const data = await response.json();
  clientSecret = data.clientSecret;

  // Initialize Stripe Elements
  const appearance = {
    theme: 'stripe',
    // Add other appearance options if needed
  };
  elements = stripe.elements({ appearance, clientSecret });

  // Create and mount the Payment Element
  const paymentElementOptions = {
    layout: {
      type: 'accordion',
      defaultCollapsed: true,
      // radios: true, // Uncomment this line to show radio buttons
      // spacedAccordionItems: false // Adjust spacing if needed
    }
  };
  const paymentElement = elements.create("payment", paymentElementOptions);
  paymentElement.mount("#payment-element");
  paymentElementRef = paymentElement; // keep a reference

  // --- Add listener for Payment Element changes ---
  paymentElement.on('change', (event) => {
    const isSelected = !event.empty; // selection based purely on empty flag
    const selectedMethod = event.value?.type || '';

    // Enhanced logging
    console.log('[Stripe Iframe] Change event raw:', event);
    console.log(`[Stripe Iframe] Calculated: !event.empty = ${!event.empty}, isSelected = ${isSelected}`);

    // Log just before sending
    const messagePayload = {
      type: 'stripe-change',
      selected: isSelected,
      method: selectedMethod
    };
    console.log('[Stripe Iframe] Posting message to parent:', messagePayload);

    window.parent.postMessage(messagePayload, '*');
  });
  // --- End change listener ---

  // --- Add listener for Payment Element focus ---
  paymentElement.on('focus', (event) => {
    console.log('[Stripe Iframe] Focus event detected.');
    // Send interaction message to parent
    window.parent.postMessage({ type: 'stripe-interaction-start' }, '*');
  });
  // --- End focus listener ---
}

// Listen for messages from the parent window (test.html)
window.addEventListener('message', async (event) => {
  // Add origin check for security!
  // const expectedParentOrigin = 'http://localhost:5682'; // Or your actual parent origin
  // if (event.origin !== expectedParentOrigin) {
  //    console.warn(`[Stripe Iframe] Message ignored from origin: ${event.origin}`);
  //    return;
  // }

  console.log('[Stripe Iframe] Received message:', event.data);

  // Handle 'confirmPayment' command (existing)
  if (event.data === 'confirmPayment') {
    if (!elements) {
      console.error('Elements not initialized yet');
      // Optionally send a message back to parent indicating failure
      // window.parent.postMessage({ status: 'error', message: 'Stripe Elements not ready' }, '*');
      return;
    }

    setLoading(true); // Optional: Add a loading state indicator

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        // This should be a page served by your stripe-sample-code server (e.g., http://localhost:4242)
        return_url: `${window.location.origin}/return.html`, // Use the iframe's origin + return.html
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error) { // Check for error type (e.g., validation, card)
      if (error.type === "card_error" || error.type === "validation_error") {
        showMessage(error.message);
      } else {
        showMessage("An unexpected error occurred.");
      }
       // Optionally send a message back to parent indicating failure
      // window.parent.postMessage({ status: 'error', message: error.message || 'Payment confirmation failed' }, '*');
    }

    setLoading(false);
  }
  // --- Handle 'collapse' command ---
  else if (event.data?.type === 'collapse') {
    console.log('[Stripe Iframe] Received collapse command.');
    const pe = elements?.getElement('payment') || paymentElementRef;
    if (pe && typeof pe.collapse === 'function') {
      console.log('[Stripe Iframe] Calling collapse() on Payment Element.');
      pe.collapse();
    } else {
        console.warn('[Stripe Iframe] Could not find payment element or collapse method.');
    }
    // DO NOT send a message back from here - parent manages state
  }
  // --- End collapse handling ---
});

// ------- UI helpers (Optional) -------
function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");
  if(messageContainer){
    messageContainer.classList.remove("hidden");
    messageContainer.textContent = messageText;

    setTimeout(function () {
      messageContainer.classList.add("hidden");
      messageContainer.textContent = "";
    }, 4000);
  }
}

function setLoading(isLoading) {
  // Add logic to show/hide a loading spinner if desired
  // E.g., document.querySelector("#spinner").style.display = isLoading ? 'block' : 'none';
  // E.g., document.querySelector("#button-text").style.display = isLoading ? 'none' : 'block';
}

// Note: You might need to add a <div id="payment-message" class="hidden"></div> to checkout.html for showMessage to work.
