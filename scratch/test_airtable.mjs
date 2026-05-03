
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testAirtable() {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const url = `https://api.airtable.com/v0/${baseId}/Tax%20Overrides`;

    console.log(`Fetching from: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched ${data.records.length} records.`);
        } else {
            const text = await response.text();
            console.log(`Error body: ${text}`);
        }
    } catch (error) {
        console.error(`Fetch failed: ${error.message}`);
    }
}

testAirtable();
