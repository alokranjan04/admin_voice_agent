import { IndustryTemplate } from '../types';
import { INDUSTRY_PROMPTS } from '../config/prompts';

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
    {
        id: 'dental_clinic',
        name: 'Dental Clinic',
        industry: 'Dental',
        systemPrompt: INDUSTRY_PROMPTS.DENTAL.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.DENTAL.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Service Type', 'New or Returning Patient'],
        optionalFields: ['Email', 'Insurance Provider'],
        suggestedServices: ['Routine Cleaning', 'Emergency Exam', 'Teeth Whitening', 'Consultation'],
        defaultTone: 'Professional and Reassuring'
    },
    {
        id: 'real_estate',
        name: 'Real Estate Agency',
        industry: 'Real Estate',
        systemPrompt: INDUSTRY_PROMPTS.REAL_ESTATE.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.REAL_ESTATE.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Interest (Buy/Sell/Rent)'],
        optionalFields: ['Email', 'Budget Range', 'Location Preference'],
        suggestedServices: ['Property Viewing', 'Listing Consultation', 'Home Valuation', 'Market Analysis'],
        defaultTone: 'Enthusiastic and Proactive'
    },
    {
        id: 'hvac_home_services',
        name: 'HVAC & Home Services',
        industry: 'Home Services',
        systemPrompt: INDUSTRY_PROMPTS.HVAC.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.HVAC.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Service Address', 'Issue Description'],
        optionalFields: ['Email', 'Preferred Time Window'],
        suggestedServices: ['HVAC Repair', 'Seasonal Maintenance', 'System Installation', 'Emergency Call-out'],
        defaultTone: 'Reliable and Professional'
    },
    {
        id: 'law_firm',
        name: 'Law Firm',
        industry: 'Legal',
        systemPrompt: INDUSTRY_PROMPTS.LEGAL.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.LEGAL.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Type of Case'],
        optionalFields: ['Email', 'Opposing Party Names', 'Urgency'],
        suggestedServices: ['Initial Consultation', 'Case Review', 'Document Signing Appointment'],
        defaultTone: 'Formal and Empathetic'
    },
    {
        id: 'beauty_salon',
        name: 'Beauty & Hair Salon',
        industry: 'Beauty',
        systemPrompt: INDUSTRY_PROMPTS.BEAUTY.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.BEAUTY.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Service Desired'],
        optionalFields: ['Email', 'Preferred Stylist', 'Appointment Notes'],
        suggestedServices: ['Haircut & Style', 'Full Color', 'Manicure/Pedicure', 'Bridal Updo'],
        defaultTone: 'Friendly and Trendy'
    },
    {
        id: 'veterinary',
        name: 'Pet Care & Veterinary',
        industry: 'Veterinary',
        systemPrompt: INDUSTRY_PROMPTS.VETERINARY.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.VETERINARY.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Pet Name', 'Reason for Visit'],
        optionalFields: ['Email', 'Species/Breed'],
        suggestedServices: ['Annual Wellness Exam', 'Vaccination', 'Sick Pet Consult', 'Dental Cleaning'],
        defaultTone: 'Empathetic and Professional'
    },
    {
        id: 'aerosync_premium',
        name: 'AeroSync Premium AI',
        industry: 'Professional Consulting',
        systemPrompt: INDUSTRY_PROMPTS.AEROSYNC.SYSTEM,
        firstMessage: INDUSTRY_PROMPTS.AEROSYNC.FIRST_MESSAGE,
        mandatoryFields: ['Name', 'Phone', 'Company Name', 'Primary Tech Challenge'],
        optionalFields: ['Current Tech Stack', 'Budget Timeline'],
        suggestedServices: ['AI Strategy Audit', 'Voice Agent Deployment', 'LLM Implementation Workshop', 'Custom Automation Audit'],
        defaultTone: 'Visionary and Technical'
    }
];

export const getTemplateById = (id: string) => {
    return INDUSTRY_TEMPLATES.find(t => t.id === id);
};

export const getTemplateByIndustry = (industry: string) => {
    return INDUSTRY_TEMPLATES.find(t => t.name === industry);
};
