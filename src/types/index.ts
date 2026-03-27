import { 
  VAPI_DEFAULT_FIRST_MESSAGE, 
  VAPI_DEFAULT_KNOWLEDGE_BASE, 
  VAPI_DEFAULT_SYSTEM_PROMPT,
  AEROSYNC_SYSTEM_PROMPT,
  AEROSYNC_KNOWLEDGE_BASE
} from '../config/prompts';

export type OperationMode = 'Training' | 'Production' | 'Fallback';
export type DeliveryModeType = 'Physical' | 'Virtual' | 'Hybrid';

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  systemPrompt: string;
  firstMessage: string;
  mandatoryFields: string[];
  optionalFields: string[];
  suggestedServices: string[];
  defaultTone: string;
}

export const SUPPORTED_INDUSTRIES = [
  'Dental Clinic',
  'Real Estate Agency',
  'HVAC & Home Services',
  'Law Firm',
  'Beauty & Hair Salon',
  'Pet Care & Veterinary',
  'E-commerce & Retail',
  'SaaS & Software',
  'Healthcare & Medical',
  'Education & E-learning',
  'Financial Services & Fintech',
  'Hospitality & Tourism',
  'Manufacturing & Logistics',
  'Digital Marketing Agency',
  'Human Resources & Recruiting',
  'Professional Consulting',
  'Construction & Architecture',
  'Automobile & Car Rental',
  'Entertainment & Media',
  'Non-Profit & NGO',
  'Government & Public Sector',
  'Generic Support'
];

export interface BrandingConfig {
  appName: string;
  logoUrl: string;
  primaryColor: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: '',
  logoUrl: '',
  primaryColor: '#6366f1' // indigo-500
};

export interface BusinessMetadata {
  businessName: string;
  industry: string;
  primaryUseCase: string;
  targetUsers: string;
  description: string;
  websiteUrl?: string;
  createdAt: string;
  researchSummary?: string;
  industryFAQs?: string;
  questionnaire?: string;
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
  address?: string;
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
  voiceModel?: string;
  transcriber: {
    provider: string;
    language: string;
    model: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
  };
  backgroundSound: string;
  knowledgeBase: string; // Markdown content for FAQs etc.
  clientUrl: string; // The URL of the web client app
  avatarUrl?: string; // Optional custom bot avatar
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
    websiteUrl: '',
    createdAt: new Date().toISOString()
  },
  services: [],
  locations: [],
  resources: [],
  dataFields: {
    mandatory: ['Name', 'Phone', 'Company Name'],
    optional: ['Current Tech Stack', 'Email'],
    validationRules: 'Ensure company name is provided for B2B routing.'
  },
  conversation: {
    tone: 'Visionary, professional, and technical',
    formality: 'Professional',
    speakingStyle: 'Clear and authoritative',
    speechPace: 'Normal',
    smallTalkAllowed: true,
    identityDisclosure: 'Always'
  },
  safety: {
    allowedTopics: 'AI Automation, LLMs, Voice AI, Internal Workflows',
    disallowedTopics: 'Generic IT support, Legal advice, Personal hardware',
    complianceConstraints: 'GDPR and SOC2 compliance mentioned on request.'
  },
  integrations: {
    firebase: true,
    googleCalendar: true
  },
  operationMode: 'Production',
  vapi: {
    systemPrompt: '',
    provider: 'Google',
    model: 'gemini-2.0-flash',
    firstMessage: '',
    temperature: 0.1,
    voiceProvider: 'vapi',
    voiceId: 'Mia',
    voiceModel: 'eleven_turbo_v2_5',
    transcriber: {
      provider: 'deepgram',
      language: 'en-US',
      model: 'nova-2',
      userName: '',
      userEmail: '',
      userPhone: ''
    },
    backgroundSound: 'office',
    knowledgeBase: '',
    clientUrl: '',
    avatarUrl: ''
  }
};

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website?: string;
  assistantId: string;
  expiresAt: string;
  createdAt: string;
  isExpired?: boolean;
}