require('dotenv').config();
const fetch = require('node-fetch');

let tokenCache = { access_token: null, exp: 0 };

async function getBearer() {
  const now = Date.now() / 1000;
  if (tokenCache.access_token && tokenCache.exp - 30 > now) {
    return tokenCache.access_token;
  }
  const resp = await fetch(`${process.env.QK_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.QK_CLIENT_ID,
      client_secret: process.env.QK_CLIENT_SECRET,
    }),
  }).then(r => r.json());
  tokenCache = { access_token: resp.access_token, exp: now + resp.expires_in };
  return tokenCache.access_token;
}

async function createEmbeddedPaymentRequest(order) {
  const bearer = await getBearer();
  const body = {
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
      locale: 'en-GB',
      test_transaction: true,
    },
    redirect_urls: {
      success_url: `${process.env.YOUR_DOMAIN || 'http://localhost:4242'}/success`,
      failure_url: `${process.env.YOUR_DOMAIN || 'http://localhost:4242'}/failure`,
    },
  };
  const resp = await fetch(`${process.env.QK_API_BASE}/api/v1/embedded/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  }).then(r => r.json());
  return resp.payment_token;
}

module.exports = { createEmbeddedPaymentRequest };
