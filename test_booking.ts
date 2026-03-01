import { createEvent } from './src/services/calendarService.ts';
import * as dotenv from 'dotenv';
dotenv.config();

async function testBooking() {
    console.log("Testing generic booking payload...");
    const result = await createEvent({
        date: "2026-03-03",
        time: "11:00 AM",
        service: "Logistics requirement",
        customerName: "Alok",
        customerEmail: "neha.high07@gmail.com",
        customerPhone: "9821106441",
        duration: 60
    });

    console.log("Booking Result:", result);
}

testBooking();
