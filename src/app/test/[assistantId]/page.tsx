"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import AgentInterface from '@/components/agent-ui/AgentInterface';

export default function TestAssistantPage() {
    const params = useParams();
    const assistantId = params.assistantId as string;

    if (!assistantId) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
                <p>Invalid Assistant ID</p>
            </div>
        );
    }

    return (
        <main className="h-screen w-full">
            <AgentInterface initialAssistantId={assistantId} />
        </main>
    );
}
