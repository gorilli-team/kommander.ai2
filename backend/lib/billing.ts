import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

// Subscription Plans
export const SUBSCRIPTION_PLANS = [
  {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 50 conversations per month',
      'Basic support',
      'Limited analytics access'
    ],
  },
  {
    id: 'plan_basic',
    name: 'Basic',
    price: 10,
    features: [
      'Up to 500 conversations per month',
      'Email support',
      'Full analytics access'
    ],
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    price: 25,
    features: [
      'Unlimited conversations',
      'Priority email support',
      'Full analytics and exports'
    ],
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 99,
    features: [
      'Custom usage limits',
      'Dedicated account manager',
      'Custom analytics solutions'
    ],
  }
];

export async function createCheckoutSession(customerId: string, planId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: SUBSCRIPTION_PLANS.find(plan => plan.id === planId)?.name,
          },
          unit_amount: SUBSCRIPTION_PLANS.find(plan => plan.id === planId)?.price * 100,
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing/cancel`,
      customer: customerId,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

export async function handleWebhook(payload: Buffer, signature: string | undefined) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature || '', endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    throw new Error(err.message);
  }

  switch (event.type) {
    case 'customer.subscription.created': {
      const subscription = event.data.object;
      console.log(`Subscription created: ${subscription.id}`);
      // Handle subscription creation
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      console.log(`Invoice payment succeeded: ${invoice.id}`);
      // Handle successful payment
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`Invoice payment failed: ${invoice.id}`);
      // Handle failed payment
      break;
    }
    // ... handle other event types
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }
}
