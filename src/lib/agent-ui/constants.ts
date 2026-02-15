import { BusinessConfig } from '@/types/agent-ui/types';

// Default configuration serves as a fallback or placeholder while fetching from Firebase.
export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  "metadata": {
    "businessName": "Voice AI Agent",
    "industry": "General Business",
    "primaryUseCase": "Inquiry Handling and Scheduling",
    "targetUsers": "General public",
    "description": "A generic voice AI agent template waiting for configuration."
  },
  "services": [
    {
      "name": "General Consultation",
      "durationMinutes": 30,
      "bookingRules": "Open booking.",
      "description": "Standard consultation service.",
      "id": "srv-general"
    }
  ],
  "locations": [
    {
      "id": "loc-main",
      "mode": "Virtual",
      "name": "Main Office",
      "operatingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "operatingHours": "09:00 - 17:00",
      "timeZone": "UTC"
    }
  ],
  "resources": [
    {
      "availabilityRules": "Standard business hours.",
      "id": "res-default",
      "name": "General Staff",
      "role": "Assistant",
      "selectionRequired": false
    }
  ],
  "dataFields": {
    "mandatory": ["Name", "Phone", "Email"],
    "optional": [],
    "validationRules": "None"
  },
  "conversation": {
    "tone": "Neutral",
    "formality": "Neutral",
    "speakingStyle": "Standard",
    "speechPace": "Normal",
    "smallTalkAllowed": true,
    "identityDisclosure": "Always"
  },
  "safety": {
    "allowedTopics": "General inquiries.",
    "disallowedTopics": "Sensitive personal information.",
    "complianceConstraints": "Standard privacy."
  },
  "operationMode": "Production",
  "integrations": {
    "googleCalendar": {
      "isConnected": false
    },
    "firebase": {
      "isConnected": true
    }
  },
  "vapi": {
    "showFloatingWidget": true
  }
};

export const generateSystemInstruction = (config: BusinessConfig) => {
  const timeZone = config.locations?.[0]?.timeZone || 'Asia/Kolkata';

  // HARDCODED REFERENCE YEAR TO FIX MODEL HALLUCINATION (Updated to 2026)
  const currentYear = 2026;

  // Dynamic Simulation Date: Use real Month/Day but force Year 2026
  // This ensures "Tomorrow" aligns with the actual day the user is testing, just shifted in years.
  const now = new Date();
  const simulatedNow = new Date(now);
  simulatedNow.setFullYear(currentYear);

  const formattedDate = simulatedNow.toLocaleDateString('en-US', { timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamic mandatory fields based on Admin Panel config
  const mandatoryFields = config.dataFields.mandatory.join(', ');

  return `
SYSTEM ROLE
You are a specialized Voice AI receptionist for ${config.metadata.businessName}.

*** CRITICAL RULES ***
1. **YEAR IS ${currentYear}**: All dates are in ${currentYear}. If user says "Tuesday", mean the next Tuesday in ${currentYear}.
2. **FOLLOW 'nextAction'**: Tools return JSON. You MUST follow the "nextAction" field in the output.
   - If nextAction="ask_patient_name" -> SAY "That time is available" AND ASK for the name.
   - DO NOT CALL 'findAvailableSlots' if the slot is found.
3. **ONE TOOL PER TURN**: Do not chain tools unless absolutely necessary.
4. **NO HALLUCINATIONS**: Use the exact time provided in the JSON output.

PROCESS FLOW
1. **GREETING**: Welcome the user.
2. **SCHEDULING**:
   - Call 'checkAvailability' for specific requests.
   - Call 'findAvailableSlots' ONLY if the user asks for suggestions or if checkAvailability failed.

   **HANDLING TOOL OUTPUT**:
   - **{"status": "success", "nextAction": "ask_patient_name"}** -> The slot is secured. Proceed to booking.
   - **{"status": "unavailable", "nextAction": "offer_alternatives"}** -> Say it's unavailable, then offer to find other slots.

3. **BOOKING**:
   - Collect: ${mandatoryFields}.
   - Call 'createBooking'.
   - **CHECK TOOL MESSAGE**: 
     - If output says "Guest Mode" or "Simulated", say: "I have recorded your request in our system (Guest Mode). No email will be sent."
     - If output says "Email: success", say: "Your appointment is booked and a confirmation email has been sent."
     - If output says "Email: failed", say: "Your appointment is booked, but I couldn't send the confirmation email."

*** TEMPORAL TRUTH ***
- **TODAY'S DATE (Simulated)**: ${formattedDate}
- **TARGET YEAR**: ${currentYear}
`;
};
