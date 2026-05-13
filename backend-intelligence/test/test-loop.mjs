
import { supabaseRequest } from '../lib/supabase-client.mjs';
import { airtableUpsert } from '../../api/_lib/airtable-client.js';
import dotenv from 'dotenv';
dotenv.config();

const findingId = '97d02a98-2aa1-40cc-8f41-8fa1ae9bf1ba';

async function test() {
    console.log('🧪 Testing Approval & Sync Loop...');

    // 1. Manually update Supabase status (simulating API PATCH)
    console.log('📡 Updating Supabase finding to approved...');
    await supabaseRequest(`swarm_findings?id=eq.${findingId}`, 'PATCH', {
        body: {
            status: 'approved',
            reviewed_by: 'test-script',
            reviewed_at: new Date().toISOString()
        }
    });

    // 2. Trigger Airtable Sync (simulating API logic)
    console.log('📡 Fetching finding details for sync...');
    const findings = await supabaseRequest('swarm_findings', 'GET', {
        params: { id: `eq.${findingId}` }
    });
    
    if (findings && findings.length > 0) {
        const finding = findings[0];
        const { finding_type, country_slug, city_slug, proposed_value } = finding;
        
        console.log(`📡 Syncing ${finding_type} for ${country_slug}...`);
        
        const fields = {
            'City Slug': city_slug || country_slug,
            'Tax Override': proposed_value.value?.toString() || '',
            'Tax Regime Name': proposed_value.summary || '',
            'Expert Notes': proposed_value.reasoning || '',
            'Visa Cost': proposed_value.visa_cost || 2500
        };

        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const TABLE_NAME = 'Tax Overrides';

        try {
            const res = await airtableUpsert(AIRTABLE_BASE_ID, TABLE_NAME, AIRTABLE_API_KEY, fields, 'City Slug');
            console.log('✅ Airtable Sync Successful!', res.id);
        } catch (err) {
            console.error('❌ Airtable Sync Failed:', err.message);
        }
    }

    // 3. Run Writer Agent to generate content
    console.log('\n🚀 Triggering Writer Agent (--approved-only)...');
    const { execSync } = await import('child_process');
    try {
        execSync('node backend-intelligence/agents/writer.mjs --approved-only', { stdio: 'inherit' });
        console.log('✅ Writer Agent execution finished.');
    } catch (err) {
        console.error('❌ Writer Agent failed:', err.message);
    }
}

test();
