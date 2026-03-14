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

        const docRef = adminDb.collection('organizations').doc(orgId).collection('agents').doc(agentId);
        let docSnap = await docRef.get();

        if (!docSnap.exists) {
            // Fallback for Lead Agents (Temporary Assistants)
            console.log(`[Agent API] Agent ${agentId} not found in org ${orgId}. Checking temporary_assistants...`);
            const leadRef = adminDb.collection('temporary_assistants').doc(agentId);
            docSnap = await leadRef.get();
            
            if (!docSnap.exists) {
                return NextResponse.json(
                    { error: 'Agent not found' },
                    { status: 404 }
                );
            }
            
            // Transform temporary lead data into AgentConfiguration format
            const leadData = docSnap.data();
            if (!leadData) throw new Error("Document exists but data is missing");

            return NextResponse.json({
                id: agentId,
                metadata: {
                    businessName: leadData.company || "Sutherland",
                    industry: leadData.industry || "Global Experience Transformation",
                    description: leadData.companyDetails || "Voice AI Division",
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

        return NextResponse.json(docSnap.data());
    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
