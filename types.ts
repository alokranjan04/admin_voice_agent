export type OperationMode = 'Training' | 'Production' | 'Fallback';
export type DeliveryModeType = 'Physical' | 'Virtual' | 'Hybrid';

export interface BusinessMetadata {
  businessName: string;
  industry: string;
  primaryUseCase: string;
  targetUsers: string;
  description: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  bookingRules: string;
}

export interface Location {
  id: string;
  name: string;
  mode: DeliveryModeType;
  operatingDays: string[];
  operatingHours: string;
  timeZone: string;
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  availabilityRules: string;
  selectionRequired: boolean;
}

export interface DataFields {
  mandatory: string[];
  optional: string[];
  validationRules: string;
}

export interface ConversationRules {
  tone: string;
  formality: 'Casual' | 'Professional' | 'Formal';
  speakingStyle: string;
  speechPace: 'Slow' | 'Normal' | 'Fast';
  smallTalkAllowed: boolean;
  identityDisclosure: 'Always' | 'On Demand' | 'Never';
}

export interface SafetyBoundaries {
  allowedTopics: string;
  disallowedTopics: string;
  complianceConstraints: string;
}

export interface Integrations {
  firebase: boolean;
  googleCalendar: boolean;
  stripe?: boolean;
}



export interface VapiConfiguration {
  systemPrompt: string;
  provider: string;
  model: string;
  firstMessage: string;
  temperature: number;
  voiceProvider: string;
  voiceId: string;
  transcriber: {
    provider: string;
    language: string;
    model: string;
  };
  backgroundSound: string;
  knowledgeBase: string; // Markdown content for FAQs etc.
}

export interface AgentConfiguration {
  metadata: BusinessMetadata;
  services: Service[];
  locations: Location[];
  resources: Resource[];
  dataFields: DataFields;
  conversation: ConversationRules;
  safety: SafetyBoundaries;
  integrations: Integrations;
  operationMode: OperationMode;
  vapi: VapiConfiguration;
}

export const INITIAL_CONFIG: AgentConfiguration = {
  metadata: {
    businessName: '',
    industry: '',
    primaryUseCase: '',
    targetUsers: '',
    description: '',
    createdAt: new Date().toISOString()
  },
  services: [],
  locations: [],
  resources: [],
  dataFields: {
    mandatory: ['Name', 'Phone'],
    optional: ['Email'],
    validationRules: 'Phone must be E.164 format'
  },
  conversation: {
    tone: 'Helpful and polite',
    formality: 'Professional',
    speakingStyle: 'Clear and concise',
    speechPace: 'Normal',
    smallTalkAllowed: true,
    identityDisclosure: 'Always'
  },
  safety: {
    allowedTopics: 'Services, Booking, Business Info',
    disallowedTopics: 'Competitors, Personal Advice, Politics',
    complianceConstraints: 'None'
  },
  integrations: {
    firebase: true,
    googleCalendar: false
  },
  operationMode: 'Training',
  vapi: {
    systemPrompt: `AI Assistant is a sophisticated AI training assistant, crafted by experts in customer support and AI development at {{COMPANY_NAME}} within the {{DEPARTMENT_NAME}} team. Designed with the persona of a seasoned customer support professional, AI Assistant combines deep technical knowledge with a strong sense of emotional intelligence. AI Assistant’s primary role is to serve as a dynamic training platform for customer support agents, simulating a broad range of service scenarios, from basic inquiries to complex problem-solving challenges.

AI Assistant’s advanced capabilities allow it to replicate diverse customer service situations, making it an invaluable tool for training purposes. It guides new agents through simulated interactions, offering real-time feedback and guidance to refine skills in handling customer needs with patience, empathy, and professionalism. AI Assistant ensures every trainee learns to listen actively, respond thoughtfully, and uphold the highest standards of customer care.

Primary Mode of Interaction

AI Assistant interacts primarily through voice, accurately interpreting spoken queries and responding naturally through audio. This design prepares trainees for real customer conversations and live call environments. AI Assistant is engineered to recognize and adapt to emotional cues in speech, allowing trainees to practice managing emotional nuances with confidence and care.

Training Guidance

AI Assistant encourages trainees to practice active listening by acknowledging customer queries with clear confirmation of engagement, such as expressing presence and readiness to help.

AI Assistant emphasizes clear and empathetic communication, always tailored to the specific context of each interaction.

AI Assistant demonstrates how to handle unclear or complex customer concerns by asking thoughtful, open-ended clarifying questions in a natural and human manner.

AI Assistant teaches trainees to express empathy and understanding, particularly when customers are frustrated or dissatisfied, ensuring concerns are addressed with care and a strong focus on resolution.

AI Assistant prepares agents to transition interactions smoothly to human colleagues when appropriate, reinforcing the importance of human connection in sensitive or complex situations.

AI Assistant’s overarching mission is to strengthen the human side of customer support through immersive, scenario-based training. It is not merely an answer engine, but a refined training platform designed to develop knowledgeable, empathetic, and adaptable customer support professionals.

Additional Instruction

AI Assistant must not use numeric characters in any response.`,
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    firstMessage: 'Hi there, this is AI Agent from {{Company name}}. How can I help you today?',
    temperature: 0.3,
    voiceProvider: 'vapi',
    voiceId: 'Mia', // specialized voice name
    transcriber: {
      provider: 'deepgram',
      language: 'en',
      model: 'nova-2'
    },
    backgroundSound: 'default',
    knowledgeBase: `# FAQs for {{Company Name}}

## 1. What services do you offer?
We offer a range of services tailored to your needs. Please ask our AI assistant or check our services page for specific offerings.

## 2. How can I book an appointment?
You can book an appointment directly through our website, by calling us, or by speaking with our AI assistant immediately.

## 3. What are your operating hours?
We are open from Monday to Friday, 9:00 AM to 5:00 PM. Weekend availability varies by location.

## 4. Do you offer virtual consultations?
Yes, we offer virtual consultations for select services. Please check our booking page for availability.

## 5. What is your cancellation policy?
We require at least 24 hours' notice for cancellations. Late cancellations may incur a fee.

## 6. Where are you located?
Our primary location is [Address]. We also serve clients remotely depending on the service.

## 7. Do you accept insurance?
We stand by our transparent pricing. Please contact our billing department to discuss insurance compatibility.

## 8. How can I contact support?
You can reach our support team via email at support@[company].com or by calling our main line.

## 9. Is there a parking area?
Yes, generic parking is available on-site for all our visitors.

## 10. What payment methods do you accept?
We accept all major credit cards, debit cards, and digital payment methods like Apple Pay and Google Pay.`
  }
};