const http = require('http');

const data = JSON.stringify({
    message: {
        toolCalls: [
            {
                id: "call_123_456",
                function: {
                    name: "findAvailableSlots",
                    arguments: {
                        date: "2026-03-02", // Test "tomorrow" based on current 03-01 date!
                        duration: 60
                    }
                }
            }
        ]
    }
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/vapi/tools',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        console.log("Response Body:", responseData);
    });
});

req.on('error', (error) => {
    console.error("Error calling Vapi Tools API:", error);
});

req.write(data);
req.end();
