export interface Service {
  name: string;
  durationMinutes: number;
  bookingRules: string;
  description: string;
  id: string;
}

export interface Location {
  id: string;
  mode: string;
  name: string;
  operatingDays: string[];
  operatingHours: string;
  timeZone: string;
}

export interface Resource {
  availabilityRules: string;
  id: string;
  name: string;
  role: string;
  selectionRequired: boolean;
}

export interface Integrations {
  googleCalendar?: {
    isConnected: boolean;
    accessToken?: string; // Storing token for persistence as requested
    refreshToken?: string; // BACKEND MIGRATION: Webhook needs this for 24/7 access
    calendarId?: string;
    connectedEmail?: string;
  };
  firebase?: {
    isConnected: boolean;
    projectId?: string;
  }
}

export interface BusinessConfig {
  id?: string; // Firestore Document ID for updates
  metadata: {
    businessName: string;
    industry: string;
    primaryUseCase: string;
    targetUsers: string;
    description: string;
    createdAt?: string;
  };
  services: Service[];
  locations: Location[];
  resources: Resource[];
  dataFields: {
    mandatory: string[];
    optional: string[];
    validationRules: string;
  };
  conversation: {
    tone: string;
    formality: string;
    speakingStyle: string;
    speechPace: string;
    smallTalkAllowed: boolean;
    identityDisclosure: string;
  };
  safety: {
    allowedTopics: string;
    disallowedTopics: string;
    complianceConstraints: string;
  };
  operationMode: string;
  integrations?: Integrations;
  savedAt?: string; // Timestamp from Admin Panel
  vapi?: {
    model?: string;
    provider?: string;
    voiceId?: string;
    voiceProvider?: string;
    firstMessage?: string;
    systemPrompt?: string;
    knowledgeBase?: string;
    temperature?: number;
    transcriber?: {
      provider?: string;
      model?: string;
      language?: string;
      userName?: string;
      userEmail?: string;
      userPhone?: string;
    };
    assistantId?: string;
    showFloatingWidget?: boolean;
  };
}