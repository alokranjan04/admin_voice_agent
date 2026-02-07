import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            throw new Error('Missing stripe-signature or endpoint secret');
        }
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.orgId;

                if (orgId) {
                    console.log(`[Stripe Webhook] Payment success for Org: ${orgId}`);

                    // Update organization status in Firestore
                    const orgRef = adminDb.collection('organizations').doc(orgId);
                    await orgRef.set({
                        plan: 'PRO',
                        stripeSubscriptionId: session.subscription as string,
                        stripeCustomerId: session.customer as string,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });

                    console.log(`[Stripe Webhook] Updated Org ${orgId} to PRO plan`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const orgId = subscription.metadata?.orgId;

                if (orgId) {
                    console.log(`[Stripe Webhook] Subscription deleted for Org: ${orgId}`);
                    await adminDb.collection('organizations').doc(orgId).set({
                        plan: 'BASIC',
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Stripe Webhook Processing Error]', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
