import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
    try {
        const { orgId, agentId } = await params;

        if (!adminDb) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        console.log(`[Agent API] Fetching Agent: ${agentId} (Org: ${orgId})`);

        // 1. ALWAYS try Lead Agents first (Temporary Assistants) - Highly likely for live interactions
        const leadRef = adminDb.collection('temporary_assistants').doc(agentId);
        const leadSnap = await leadRef.get();
        
        if (leadSnap.exists) {
            console.log(`[Agent API] Found in temporary_assistants: ${agentId}`);
            const leadData = leadSnap.data();
            if (!leadData) throw new Error("Lead document exists but data is missing");

            return NextResponse.json({
                id: agentId,
                metadata: {
                    businessName: leadData.company || "Your Business",
                    industry: leadData.industry || "Professional Services",
                    description: leadData.companyDetails || "Voice AI Solutions",
                },
                services: leadData.services || [],
                locations: [],
                vapi: {
                    assistantId: agentId,
                    provider: 'openai',
                    model: 'gpt-4o-mini'
                }
            });
        }

        // 2. Fallback to standard organizational agents
        console.log(`[Agent API] Checking organizations/${orgId}/agents/${agentId}`);
        const docRef = adminDb.collection('organizations').doc(orgId).collection('agents').doc(agentId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return NextResponse.json(docSnap.data());
        }

        return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
