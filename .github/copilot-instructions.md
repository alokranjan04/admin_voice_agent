# Voice AI Admin Configurator - AI Agent Guidelines

## Project Overview
This is a React-based web application for configuring voice AI agents using AI assistance. The app generates structured configurations from natural language descriptions and stores them in Firebase.

## Architecture
- **Frontend**: React 19 with TypeScript, built with Vite
- **Authentication**: Firebase Auth with Google OAuth (includes Calendar scope)
- **Data Storage**: Firebase Firestore for agent configurations
- **AI Service**: Google Gemini 1.5 Pro for config generation from descriptions
- **UI**: Custom components with Lucide React icons, Tailwind CSS styling

## Key Components
- `App.tsx`: Main component handling auth state, config management, and AI generation
- `services/firebase.ts`: Auth and Firestore operations
- `services/geminiService.ts`: AI-powered config generation with structured JSON schema
- `types.ts`: TypeScript interfaces for `AgentConfiguration` and related types
- Components: `LoginScreen.tsx`, `Sidebar.tsx` for navigation

## Configuration Structure
Agent configs follow `AgentConfiguration` interface with sections:
- `metadata`: Business info (name, industry, use case)
- `services`: Array of service definitions with durations and booking rules
- `locations`: Delivery modes (Physical/Virtual/Hybrid) with operating details
- `resources`: Staff/resources with availability rules
- `dataFields`: Mandatory/optional user data requirements
- `conversation`: Tone, formality, speaking style, pace
- `safety`: Topic boundaries and compliance constraints
- `operationMode`: Training/Production/Fallback

## Development Workflow
1. **Setup**: Copy `.env` to `.env.local`, set `GEMINI_API_KEY` and Firebase vars
2. **Run**: `npm run dev` starts Vite dev server on port 3000
3. **Build**: `npm run build` for production build
4. **Auth**: Requires Google login; handles config errors gracefully

## AI Generation Patterns
- Use `generateConfigFromDescription()` in `geminiService.ts` for AI config creation
- Provides natural language prompt → structured JSON via Gemini with response schema
- Post-processes to add missing IDs for services/locations/resources
- Merges generated config into existing state, preserving unchanged sections

## Environment Variables
- `GEMINI_API_KEY`: Required for AI generation
- `VITE_FIREBASE_*`: Firebase config (API key, auth domain, etc.)
- `VITE_GOOGLE_CLIENT_ID`: For Google OAuth
- Fallbacks in `firebase.ts` allow app to load without full config, failing predictably

## Code Patterns
- **State Management**: React hooks (`useState`, `useEffect`) in App.tsx
- **Error Handling**: Try/catch with user alerts for auth and API failures
- **Data Persistence**: Saves to Firestore with user email/UID, doc ID based on business name
- **UI Navigation**: Sidebar with section IDs, smooth scrolling to elements
- **Validation**: Basic form validation; "Lock" saves and prevents further edits

## Common Tasks
- **Add new config section**: Update `types.ts`, `INITIAL_CONFIG`, and App.tsx rendering logic
- **Modify AI schema**: Edit `responseSchema` in `geminiService.ts` to match new types
- **Handle auth errors**: Check for `CONFIGURATION_ERROR` prefix in error messages
- **Extend services**: Add new functions to `firebase.ts` or `geminiService.ts` as needed

## Dependencies
- `@google/genai`: Gemini AI integration
- `firebase`: Auth and Firestore
- `lucide-react`: Icon library
- `react`/`react-dom`: UI framework
- `vite`: Build tool with React plugin</content>
<parameter name="filePath">c:\Users\Alok Ranjan\OneDrive\Documents\Voice_AI_Admin\.github\copilot-instructions.md