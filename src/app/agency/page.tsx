import { redirect } from 'next/navigation';

// Redirect /agency → /agency/admin (the main Admin Configurator)
export default function AgencyPage() {
    redirect('/agency/admin');
}
