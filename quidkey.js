require('dotenv').config();
// Dynamic import to stay compatible with CommonJS
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

let tokenCache = { access_token: null, exp: 0 };

async function getBearer() {
  const now = Date.now() / 1000;
  if (tokenCache.access_token && tokenCache.exp - 30 > now) {
    return tokenCache.access_token;
  }
  const resp = await fetch(`${process.env.QK_API_BASE}/api/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.QK_CLIENT_ID,
      client_secret: process.env.QK_CLIENT_SECRET,
    }),
  }).then(r => r.json());
  tokenCache = { access_token: resp.data.access_token, exp: now + resp.data.expires_in };
  console.log(`[Quidkey] Token: ${tokenCache.access_token}`);
  console.log(`[Quidkey] Token cached for ${resp.data.expires_in} seconds`);
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
      success_url: `https://google.com/success`,
      failure_url: `https://google.com//failure`,
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
  console.log(`[Quidkey] Payment response: ${JSON.stringify(resp)}`);
  console.log(`[Quidkey] Payment request created: ${resp.data.payment_token}`);
  return resp.data.payment_token;
}

async function initiateEmbeddedPayment({ bankId, paymentToken }) {
  if (!bankId) {
    throw new Error('bankId is required');
  }
  if (!paymentToken) {
    throw new Error('paymentToken is required');
  }

  const url = `${process.env.QK_API_BASE}/api/v1/embedded/payment-initiation?payment_token=${encodeURIComponent(
    paymentToken
  )}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bankId }),
  }).then(r => r.json());

  if (!resp.success) {
    throw new Error(resp.error?.message || 'Unknown Quidkey error');
  }
  return resp.data.payment_link;
}

module.exports = { createEmbeddedPaymentRequest, initiateEmbeddedPayment };
