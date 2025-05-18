// This is your test secret API key.
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const cors = require('cors');
const { createEmbeddedPaymentRequest } = require('./quidkey');
const app = express();

// Use CORS middleware
app.use(cors()); // Allow all origins for development - be more specific in production!

app.use(express.static('public'));
app.use(express.json());

const YOUR_DOMAIN = 'http://localhost:4242';

app.post('/create-checkout-session', async (req, res) => {
  console.log('[Server] Received request for /create-checkout-session');
  const { email } = req.body;
  console.log(`[Server] Email received: ${email}`);

  try {
    if (!email) {
      console.error('[Server] Error: Email is required in the request body.');
      return res.status(400).send({ error: { message: 'Email is required' } });
    }

    // Look for an existing customer by email
    let customer;
    console.log(`[Server] Looking for customer with email: ${email}`);
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log(`[Server] Found existing customer: ${customer.id}`);
    } else {
      // Create a new customer if one doesn't exist
      console.log(`[Server] Creating new customer for email: ${email}`);
      customer = await stripe.customers.create({
        email: email,
      });
      console.log(`[Server] Created new customer: ${customer.id}`);
    }

    // Stub order data – in real app derive from basket
    const order = {
      customerName: 'John Doe',
      email: email,
      phone: '+49151123456',
      country: 'DE',
      orderId: `ORD-${Date.now()}`,
      amount: 9300,
      currency: 'EUR',
      reference: 'Barcelona Tryp',
    };

    // Create Quidkey payment request
    const payment_token = await createEmbeddedPaymentRequest(order);

    // Create a PaymentIntent with the order amount, currency, and customer
    console.log(`[Server] Creating PaymentIntent for customer: ${customer.id}`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // Amount in cents (e.g., 100 for €1.00)
      currency: 'eur',
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      // Optionally add setup_future_usage: 'off_session' if you plan to save the payment method
    });

    console.log(`[Server] PaymentIntent created successfully. Client Secret: ${paymentIntent.client_secret}`);
    // Send PaymentIntent client secret and Quidkey token to frontend
    res.send({ clientSecret: paymentIntent.client_secret, payment_token });

  } catch (error) {
    console.error('[Server] Error during checkout session creation:', error);
    res.status(500).send({ error: { message: 'Internal Server Error' } });
  }
});

app.get('/session-status', async (req, res) => {
  // This endpoint is now for Payment Intent status, not Checkout Session
  // We'll likely need to adjust the client-side (return.js) later to use this differently
  // or retrieve the PI directly client-side using its client_secret
  const paymentIntent = await stripe.paymentIntents.retrieve(req.query.payment_intent); // Expecting payment_intent query param

  res.send({
    status: paymentIntent.status,
    customer_email: paymentIntent.receipt_email // Or retrieve from customer object if needed
  });
});

app.listen(4242, () => console.log('Running on port 4242'));
