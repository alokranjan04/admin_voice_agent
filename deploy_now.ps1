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

Write-Host "--- 2. PREPARING ENVIRONMENT FILE ---"
$sa_key = $vars['FIREBASE_SERVICE_ACCOUNT_KEY']
$sa_base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sa_key))

$pk = $vars['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY']
$pk_base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pk))

# Create YAML content for environment variables
$yamlContent = @(
    "NODE_ENV: `"production`"",
    "GMAIL_USER: `"$($vars['GMAIL_USER'])`"",
    "GMAIL_APP_PASSWORD: `"$($vars['GMAIL_APP_PASSWORD'])`"",
    "GOOGLE_CALENDAR_ID: `"$($vars['GOOGLE_CALENDAR_ID'])`"",
    "GOOGLE_REFRESH_TOKEN: `"$($vars['GOOGLE_REFRESH_TOKEN'])`"",
    "GOOGLE_CLIENT_SECRET: `"$($vars['GOOGLE_CLIENT_SECRET'])`"",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID: `"$($vars['NEXT_PUBLIC_GOOGLE_CLIENT_ID'])`"",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL: `"$($vars['GOOGLE_SERVICE_ACCOUNT_EMAIL'])`"",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64: `"$pk_base64`"",
    "TIMEZONE: `"$($vars['TIMEZONE'])`"",
    "BUSINESS_HOURS_START: `"$($vars['BUSINESS_HOURS_START'])`"",
    "BUSINESS_HOURS_END: `"$($vars['BUSINESS_HOURS_END'])`"",
    "BUSINESS_DAYS: `"$($vars['BUSINESS_DAYS'])`"",
    "APPOINTMENT_DURATION: `"$($vars['APPOINTMENT_DURATION'])`"",
    "NEXT_PUBLIC_APP_URL: `"https://tellyourjourney.com`"",
    "NEXT_PUBLIC_GEMINI_API_KEY: `"$($vars['NEXT_PUBLIC_GEMINI_API_KEY'])`"",
    "NEXT_PUBLIC_VAPI_PUBLIC_KEY: `"$($vars['NEXT_PUBLIC_VAPI_PUBLIC_KEY'])`"",
    "VITE_VAPI_PRIVATE_KEY: `"$($vars['VITE_VAPI_PRIVATE_KEY'])`"",
    "DEFAULT_INBOUND_ASSISTANT_ID: `"$($vars['DEFAULT_INBOUND_ASSISTANT_ID'])`"",
    "NEXT_PUBLIC_FIREBASE_API_KEY: `"$($vars['NEXT_PUBLIC_FIREBASE_API_KEY'])`"",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `"$($vars['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'])`"",
    "FIREBASE_PROJECT_ID: `"$($vars['NEXT_PUBLIC_FIREBASE_PROJECT_ID'])`"",
    "FIREBASE_SERVICE_ACCOUNT_KEY_BASE64: `"$sa_base64`"",
    "FIREBASE_CLIENT_EMAIL: `"$($vars['FIREBASE_CLIENT_EMAIL'])`"",
    "TWILIO_ACCOUNT_SID: `"$($vars['TWILIO_ACCOUNT_SID'])`"",
    "TWILIO_AUTH_TOKEN: `"$($vars['TWILIO_AUTH_TOKEN'])`"",
    "TWILIO_PHONE_NUMBER: `"$($vars['TWILIO_PHONE_NUMBER'])`"",
    "VAPI_PHONE_NUMBER_ID: `"$($vars['VITE_VAPI_PHONE_NUMBER_ID'])`"",
    "VAPI_PRIVATE_API_KEY: `"$($vars['VITE_VAPI_PRIVATE_KEY'])`"",
    "STRIPE_SECRET_KEY: `"$($vars['STRIPE_SECRET_KEY'])`"",
    "STRIPE_WEBHOOK_SECRET: `"$($vars['STRIPE_WEBHOOK_SECRET'])`""
)

# Write without BOM
$Utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllLines("env.yaml", $yamlContent, $Utf8NoBom)

Write-Host "--- 3. UPDATING CLOUD RUN SERVICE ---"
gcloud run services update voice-ai-admin `
    --image="us-central1-docker.pkg.dev/$projId/voice-ai-repo/voice-ai-admin:manual-fix" `
    --region="us-central1" `
    --project=$projId `
    --env-vars-file="env.yaml" `
    --quiet

Write-Host "--- 4. CLEANUP ---"
Remove-Item "env.yaml"
