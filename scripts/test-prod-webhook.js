const axios = require('axios');

async function testLocalWebhook() {
    const payload = {
        message: {
            type: "tool-calls",
            call: {
                assistantId: "61cf387a-6b58-406f-aaf7-2ccab36098bd"
            },
            toolCalls: [
                {
                    id: "call_test123",
                    type: "function",
                    function: {
                        name: "findAvailableSlots",
                        arguments: {
                            date: "2026-03-03", // Requesting tomorrow
                            service: "Logistics Check",
                            duration: 60
                        }
                    }
                }
            ]
        }
    };

    try {
        console.log("Sending POST to http://localhost:3000/api/vapi/webhook...");
        const response = await axios.post('http://localhost:3000/api/vapi/webhook', payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("Webhook Response Status:", response.status);
        console.log("Webhook Response Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error("Webhook Error Status:", error.response.status);
            console.error("Webhook Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Request Failed:", error.message);
        }
    }
}

testLocalWebhook();
