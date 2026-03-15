# Load .env variables
$envFile = Get-Content .env
$vars = @{}
foreach ($line in $envFile) {
    if ($line -match "^([^#\s][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        # Remove outer quotes if present
        if ($val -match "^'(.*)'$") { $val = $matches[1] }
        elseif ($val -match "^`"(.*)`"$") { $val = $matches[1] }
        $vars[$key] = $val
    }
}

$projId = "ai-voice-agent-c2a2b"

Write-Host "--- 1. BUILDING CONTAINER ---"
gcloud builds submit --project $projId --config cloudbuild.yaml `
    --machine-type=n1-highcpu-32 `
    --substitutions="_NEXT_PUBLIC_FIREBASE_API_KEY=$($vars['NEXT_PUBLIC_FIREBASE_API_KEY']),_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$($vars['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']),_NEXT_PUBLIC_FIREBASE_PROJECT_ID=$($vars['NEXT_PUBLIC_FIREBASE_PROJECT_ID']),_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$($vars['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET']),_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$($vars['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']),_NEXT_PUBLIC_FIREBASE_APP_ID=$($vars['NEXT_PUBLIC_FIREBASE_APP_ID']),_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$($vars['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID']),_NEXT_PUBLIC_GEMINI_API_KEY=$($vars['NEXT_PUBLIC_GEMINI_API_KEY']),_NEXT_PUBLIC_VAPI_PUBLIC_KEY=$($vars['NEXT_PUBLIC_VAPI_PUBLIC_KEY']),_NEXT_PUBLIC_GOOGLE_CLIENT_ID=$($vars['NEXT_PUBLIC_GOOGLE_CLIENT_ID']),_NEXT_PUBLIC_APP_URL=$($vars['NEXT_PUBLIC_APP_URL']),_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$($vars['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'])" .

Write-Host "--- 2. ENCODING SECRETS ---"
$sa_key = $vars['FIREBASE_SERVICE_ACCOUNT_KEY']
$sa_base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sa_key))

$pk = $vars['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY']
$pk_base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pk))

Write-Host "--- 3. DEPLOYING TO CLOUD RUN ---"
gcloud run deploy voice-ai-admin `
    --image us-central1-docker.pkg.dev/$projId/voice-ai-repo/voice-ai-admin:manual-fix `
    --region us-central1 `
    --project $projId `
    --set-env-vars="NODE_ENV=production,GMAIL_USER=$($vars['GMAIL_USER']),GMAIL_APP_PASSWORD=$($vars['GMAIL_APP_PASSWORD']),GOOGLE_CALENDAR_ID=$($vars['GOOGLE_CALENDAR_ID']),NEXT_PUBLIC_APP_URL=https://tellyourjourney.com,NEXT_PUBLIC_GEMINI_API_KEY=$($vars['NEXT_PUBLIC_GEMINI_API_KEY']),NEXT_PUBLIC_VAPI_PUBLIC_KEY=$($vars['NEXT_PUBLIC_VAPI_PUBLIC_KEY']),VITE_VAPI_PRIVATE_KEY=$($vars['VITE_VAPI_PRIVATE_KEY']),DEFAULT_INBOUND_ASSISTANT_ID=$($vars['DEFAULT_INBOUND_ASSISTANT_ID']),NEXT_PUBLIC_FIREBASE_API_KEY=$($vars['NEXT_PUBLIC_FIREBASE_API_KEY']),NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$($vars['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN']),FIREBASE_PROJECT_ID=$($vars['NEXT_PUBLIC_FIREBASE_PROJECT_ID']),FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=$sa_base64,FIREBASE_PRIVATE_KEY_BASE64=$pk_base64,FIREBASE_CLIENT_EMAIL=$($vars['FIREBASE_CLIENT_EMAIL']),TWILIO_ACCOUNT_SID=$($vars['TWILIO_ACCOUNT_SID']),TWILIO_AUTH_TOKEN=$($vars['TWILIO_AUTH_TOKEN']),TWILIO_PHONE_NUMBER=$($vars['TWILIO_PHONE_NUMBER']),VAPI_PHONE_NUMBER_ID=$($vars['VITE_VAPI_PHONE_NUMBER_ID']),VAPI_PRIVATE_API_KEY=$($vars['VITE_VAPI_PRIVATE_KEY']),STRIPE_SECRET_KEY=$($vars['STRIPE_SECRET_KEY']),STRIPE_WEBHOOK_SECRET=$($vars['STRIPE_WEBHOOK_SECRET'])"
