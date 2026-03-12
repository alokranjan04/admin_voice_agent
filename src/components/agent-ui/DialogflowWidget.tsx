'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { BusinessConfig } from '@/types/agent-ui/types';

// Declare Google's custom element types so TypeScript doesn't complain
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'df-messenger': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                location?: string;
                'project-id'?: string;
                'agent-id'?: string;
                'language-code'?: string;
                'max-query-length'?: string;
            };
            'df-messenger-chat-bubble': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                'chat-title'?: string;
            };
        }
    }
}

interface DialogflowWidgetProps {
    config: BusinessConfig;
}

const DialogflowWidget: React.FC<DialogflowWidgetProps> = ({ config }) => {
    // Extract Dialogflow CX credentials
    const dfConfig = config.integrations?.dialogflow;
    const { projectId, location, agentId } = dfConfig || {};
    
    // Only render if we have the minimum required IDs
    const isReady = projectId && agentId;

    if (!isReady) {
        return null;
    }

    const DfMessenger = 'df-messenger' as any;
    const DfMessengerChatBubble = 'df-messenger-chat-bubble' as any;

    return (
        <>
            {/* Load Google's official Dialogflow script */}
            <Script 
                src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js" 
                strategy="lazyOnload"
            />
            
            {/* Render the Web Component */}
            <DfMessenger
                location={location || 'global'}
                project-id={projectId}
                agent-id={agentId}
                language-code="en"
                max-query-length="-1"
            >
                <DfMessengerChatBubble 
                    chat-title={config.metadata?.businessName || 'Chat'}
                ></DfMessengerChatBubble>
            </DfMessenger>

            {/* Scoped styles to position the messenger properly */}
            <style jsx global>{`
                df-messenger {
                    z-index: 999;
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                }
            `}</style>
        </>
    );
};

export default DialogflowWidget;
