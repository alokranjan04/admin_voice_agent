const fs = require('fs');

const code = fs.readFileSync('src/services/agent-ui/vapiService.ts', 'utf8');

const regex = /private async sendEmailSummary\([\s\S]*?\n    }\n/m;

const replacement = `private async sendEmailSummary(summary: string, transcript: string): Promise<{ success: boolean; error?: string }> {
        const targetEmail = this.getEnvVar('NEXT_PUBLIC_NOTIFICATION_EMAIL') || this.getEnvVar('VITE_NOTIFICATION_EMAIL');

        try {
            this.onLog({ type: 'system', text: 'Sending summary email via Server API...', timestamp: new Date() });

            // Multi-layer fallback for customer details
            const urlParams = new URLSearchParams(window.location.search);

            const customerName = this.sessionMetadata?.userName
                || this.sessionMetadata?.name
                || this.currentConfig?.vapi?.transcriber?.userName
                || (this.currentConfig?.vapi as any)?.userName
                || urlParams.get('uName')
                || 'N/A';
            const customerEmail = this.sessionMetadata?.userEmail
                || this.sessionMetadata?.email
                || this.currentConfig?.vapi?.transcriber?.userEmail
                || (this.currentConfig?.vapi as any)?.userEmail
                || urlParams.get('uEmail')
                || 'N/A';
            const customerPhone = this.sessionMetadata?.userPhone
                || this.sessionMetadata?.phone
                || this.currentConfig?.vapi?.transcriber?.userPhone
                || (this.currentConfig?.vapi as any)?.userPhone
                || urlParams.get('uPhone')
                || 'N/A';

            console.log("[Email] Final customer details:", { customerName, customerEmail, customerPhone });

            // Point to the Next.js Nodemailer API route instead of EmailJS
            const baseUrl = this.getEnvVar('NEXT_PUBLIC_APP_URL') || '';
            const apiUrl = \`\${baseUrl.replace(/\\/$/, '')}/api/email\`;

            const payload = {
                summary,
                transcript,
                targetEmail: targetEmail || 'admin@example.com',
                ccEmail: customerEmail !== 'N/A' && customerEmail !== 'Unknown' && customerEmail !== 'undefined' ? customerEmail : '',
                customerName: customerName !== 'N/A' && customerName !== 'Unknown' && customerName !== 'undefined' ? customerName : 'Customer',
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[PostCall] Server Email API Error:', data.error);
                return { success: false, error: data.error };
            }

            console.log("[PostCall] Email successfully delivered via Nodemailer API");
            this.onLog({ type: 'system', text: 'Email summary delivered successfully.', timestamp: new Date() });
            
            return { success: true };
            
        } catch (error: any) {
            console.error("[PostCall] Network Error sending Email API request:", error);
            this.onLog({ type: 'system', text: \`Failed to send email: \${error.message || 'Unknown error'}\`, timestamp: new Date() });
            return { success: false, error: error.message || 'Unknown error' };
        }
    }
`;

const newCode = code.replace(regex, replacement);
fs.writeFileSync('src/services/agent-ui/vapiService.ts', newCode);
console.log("Successfully patched vapiService.ts to use Nodemailer API");
