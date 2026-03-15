import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
    try {
        const { orgId, agentId } = await params;
        const db = getAdminDb();

        console.log(`[Agent API DEBUG] Request for orgId: ${orgId}, agentId: ${agentId}`);

        if (!db) {
            console.error('[Agent API DEBUG] Firebase Admin NOT INITIALIZED');
            return NextResponse.json(
                { error: 'Firebase Admin not initialized', details: 'getAdminDb() returned null' },
                { status: 500 }
            );
        }

        // 1. Try Lead Agents first
        console.log(`[Agent API DEBUG] Checking temporary_assistants/${agentId}`);
        const leadRef = db.collection('temporary_assistants').doc(agentId);
        const leadSnap = await leadRef.get();
        
        if (leadSnap.exists) {
            console.log(`[Agent API DEBUG] Found in temporary_assistants: ${agentId}`);
            const leadData = leadSnap.data();
            if (!leadData) {
                console.error(`[Agent API DEBUG] Lead ${agentId} exists but data is EMPTY`);
                throw new Error("Lead document exists but data is missing");
            }

            return NextResponse.json({
                id: agentId,
                metadata: {
                    businessName: leadData.company || "Your Business",
                    industry: leadData.industry || "Professional Services",
                    description: leadData.companyDetails || "Voice AI Solutions",
                    researchSummary: leadData.researchSummary || "",
                    industryFAQs: leadData.industryFAQs || "",
                    questionnaire: leadData.questionnaire || "",
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

        // 2. Fallback to standard agents
        console.log(`[Agent API DEBUG] Checking organizations/${orgId}/agents/${agentId}`);
        const docRef = db.collection('organizations').doc(orgId).collection('agents').doc(agentId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            console.log(`[Agent API DEBUG] Found in organizations: ${agentId}`);
            return NextResponse.json(docSnap.data());
        }

        console.warn(`[Agent API DEBUG] Agent ${agentId} NOT FOUND in any collection`);
        return NextResponse.json(
            { error: 'Agent not found', debug: { orgId, agentId, checked: ['temporary_assistants', 'organizations'] } },
            { status: 404 }
        );
    } catch (error: any) {
        console.error('[Agent API DEBUG] ERROR:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration', message: error.message },
            { status: 500 }
        );
    }
}
