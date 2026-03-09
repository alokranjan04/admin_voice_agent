import { createEvent } from './src/services/calendarService';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
    try {
        console.log("Running createEvent test...");
        const result = await createEvent({
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            time: "10:00 AM",
            service: "Demo Booking",
            customerName: "Test User",
            customerEmail: "tellyourjourney.test@yopmail.com",
            company: "Test Company",
            problem: "Test Problem"
        });
        console.log("Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
