import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
    try {
        const { orgId, agentId } = await params;

        if (!db) {
            return NextResponse.json(
                { error: 'Firebase not initialized' },
                { status: 500 }
            );
        }

        const docRef = doc(db, 'organizations', orgId, 'agents', agentId);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Fallback for Lead Agents (Temporary Assistants)
            console.log(`[Agent API] Agent ${agentId} not found in org ${orgId}. Checking temporary_assistants...`);
            const leadRef = doc(db, 'temporary_assistants', agentId);
            docSnap = await getDoc(leadRef);
            
            if (!docSnap.exists()) {
                return NextResponse.json(
                    { error: 'Agent not found' },
                    { status: 404 }
                );
            }
            
            // Transform temporary lead data into AgentConfiguration format
            const leadData = docSnap.data();
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
