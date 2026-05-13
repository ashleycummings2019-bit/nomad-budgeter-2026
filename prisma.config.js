import fs from 'node:fs';
import path from 'node:path';

// Manual .env loading for Prisma 7 CLI compatibility
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?$/m);
      if (match) databaseUrl = match[1];
    }
  } catch (e) {
    // Ignore errors
  }
}

export default {
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl || "postgresql://postgres.yqizutlobdiwvcgljinx:Jayne%4019651987@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
  }
};
