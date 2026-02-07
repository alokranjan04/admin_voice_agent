import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('[Stripe] STRIPE_SECRET_KEY is missing. Payment features will be disabled.');
    }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
});
