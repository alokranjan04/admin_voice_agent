import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { orgId, returnUrl } = await req.json();

        if (!orgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }

        // Fetch the Organization from Firebase to get their Stripe Customer ID
        const orgDoc = await adminDb.collection('organizations').doc(orgId).get();

        if (!orgDoc.exists) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const orgData = orgDoc.data();
        const customerId = orgData?.stripeCustomerId;

        if (!customerId) {
            return NextResponse.json({ error: 'No active Stripe Customer ID found for this organization.' }, { status: 400 });
        }

        // Create a Stripe Customer Portal Session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/agency/admin',
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error('[Stripe Portal Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
