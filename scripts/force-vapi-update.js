const axios = require('axios');

const VAPI_PRIVATE_KEY = "107e68ad-e993-4394-9c2a-279d551c475a"; // from .env
const VAPI_ASSISTANT_ID = "61cf387a-6b58-406f-aaf7-2ccab36098bd"; // Dubai News specific ID

async function forceUpdateVapi() {
    try {
        console.log("Fetching existing VAPI Assistant config directly from VAPI cloud...");
        const getRes = await axios.get(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
            }
        });

        const assistant = getRes.data;

        console.log(`Modifying tool parameters for ${assistant.name}...`);

        // Find checkAvailability and modify its parameters
        if (assistant.model && assistant.model.tools) {
            const checkTool = assistant.model.tools.find(t => t.function.name === 'checkAvailability');
            if (checkTool) {
                checkTool.function.parameters.properties = {
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    time: { type: "string", description: "Time in HH:MM format (24-hour) to check" }
                };
                checkTool.function.parameters.required = ["date"];
            }

            // Find findAvailableSlots and modify its parameters
            const findTool = assistant.model.tools.find(t => t.function.name === 'findAvailableSlots');
            if (findTool) {
                findTool.function.parameters.properties = {
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    duration: { type: "number", description: "Appointment duration in minutes (default: 60)" }
                };
                findTool.function.parameters.required = ["date"];
            }
        }

        console.log("Pushing new schema OVERWRITE directly to VAPI cloud...");

        const patchRes = await axios.patch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
            model: assistant.model // push the updated model back
        }, {
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Success! VAPI Cloud has been manually patched. New Assistant Config ID:", patchRes.data.id);

    } catch (err) {
        if (err.response) {
            console.error("VAPI API Error:", err.response.data);
        } else {
            console.error(err);
        }
    }
}

forceUpdateVapi();
