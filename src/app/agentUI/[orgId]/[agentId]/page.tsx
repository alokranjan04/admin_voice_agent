import AgentInterface from '@/components/agent-ui/AgentInterface';

interface PageProps {
    params: Promise<{
        orgId: string;
        agentId: string;
    }>;
}

export default async function AgentTenantPage(props: PageProps) {
    const params = await props.params;
    const { orgId, agentId } = params;
    return (
        <AgentInterface initialOrgId={orgId} initialAgentId={agentId} />
    );
}
