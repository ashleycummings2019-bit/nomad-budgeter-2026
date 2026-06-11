import dotenv from 'dotenv';
dotenv.config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Content Pipeline';

async function main() {
    console.log(`Fetching records from Airtable...`);
    // We fetch rows that are marked 'Done' but might have empty social fields due to the previous bug
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
    if (!res.ok) throw new Error(`Fetch failed: ${await res.text()}`);
    
    const data = await res.json();
    
    const affected = data.records.filter(r => {
        const status = r.fields['Status'];
        if (status !== 'Done') return false; // only touch ones that were processed
        
        const fb = r.fields['Facebook'];
        const li = r.fields['LinkedIn'];
        const tw = r.fields['Twitter'];
        
        return (!fb || fb.trim() === '') || (!li || li.trim() === '') || (!tw || tw.trim() === '');
    });

    console.log(`Found ${affected.length} affected records with missing social text.`);

    for (const r of affected) {
        console.log(`Resetting record ${r.id} (Topic: ${r.fields['Topic'] || 'Unknown'}) to 'Needs Draft'...`);
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${r.id}`;
        const updateRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    'Status': 'Needs Draft'
                }
            })
        });
        if (!updateRes.ok) {
            console.error(`Failed to update ${r.id}: ${await updateRes.text()}`);
        }
    }
    console.log('Finished resetting. Proceeding to re-run the CMO script...');
}

main().catch(console.error);
