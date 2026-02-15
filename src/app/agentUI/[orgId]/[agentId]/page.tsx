import AgentInterface from '@/components/agent-ui/AgentInterface';

interface PageProps {
    params: {
        orgId: string;
        agentId: string;
    };
}

export default async function AgentTenantPage({ params }: PageProps) {
    const { orgId, agentId } = await params;
    return (
        <AgentInterface initialOrgId={orgId} initialAgentId={agentId} />
    );
}
