// Initialize Stripe.js using your publishable key
const stripe = Stripe("pk_test_51N448BBY03jTxzpG6n5YQlcLJfeIijwZs00h8pCUtlejBXSnEf13j0cf5ISSf0b7pL7rRWzDVPFRrCczw8A7Vnki00Cefk3jwj");

// Retrieve the PaymentIntent client secret from the URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const clientSecret = urlParams.get('payment_intent_client_secret');

// Retrieve the PaymentIntent
stripe.retrievePaymentIntent(clientSecret).then(({paymentIntent}) => {
  const message = document.querySelector("#message")

  // Inspect the PaymentIntent `status` to indicate the status of the payment
  // to your customer.
  //
  // Some payment methods will [immediately succeed or fail][0] upon
  // confirmation, while others will first enter a `processing` state.
  //
  // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
  switch (paymentIntent.status) {
    case 'succeeded':
      message.innerText = "Success! Payment received.";
      // Optionally display customer email: paymentIntent.receipt_email
      // document.getElementById('customer-email').textContent = paymentIntent.receipt_email;
      break;

    case 'processing':
      message.innerText = "Payment processing. We'll update you when payment is received.";
      break;

    case 'requires_payment_method':
      // Redirect your customer back to your payment page to try again
      message.innerText = "Payment failed. Please try another payment method.";
      // Add a button/link to redirect back to checkout.html
      // Example: window.location.replace('checkout.html');
      break;

    default:
      message.innerText = "Something went wrong.";
      break;
  }
});
