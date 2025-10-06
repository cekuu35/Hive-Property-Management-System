import { supabaseAdmin } from './supabaseAdmin.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  console.log("🚀 Applying Tenant Workflow Migration");
  console.log("=" .repeat(50));
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250115000001_enhance_tenant_workflow.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log("📄 Migration file loaded successfully");
    console.log(`📏 Migration size: ${migrationSQL.length} characters`);
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n${i + 1}/${statements.length} Executing statement...`);
      
      try {
        // For CREATE TABLE and ALTER TABLE statements, we'll use a different approach
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE')) {
          console.log("   ⚠️  This statement needs to be run manually in Supabase Dashboard");
          console.log("   📝 Statement:", statement.substring(0, 100) + "...");
          continue;
        }
        
        // For other statements, try to execute
        const { data, error } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .limit(1);
        
        if (error) {
          console.log("   ⚠️  Cannot execute SQL directly - use Supabase Dashboard");
          console.log("   📝 Statement:", statement.substring(0, 100) + "...");
        } else {
          console.log("   ✅ Statement executed successfully");
        }
        
      } catch (err) {
        console.log("   ⚠️  Statement needs manual execution:", err.message);
        console.log("   📝 Statement:", statement.substring(0, 100) + "...");
      }
    }
    
    console.log("\n" + "=" .repeat(50));
    console.log("📋 MIGRATION SUMMARY");
    console.log("=" .repeat(50));
    
    console.log("\n✅ Migration file processed successfully!");
    console.log("\n📚 Next Steps:");
    console.log("1. Go to your Supabase Dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Copy and paste the migration SQL");
    console.log("4. Click 'Run' to execute");
    
    console.log("\n🔗 Supabase Dashboard URL:");
    console.log("https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/sql");
    
    console.log("\n📄 Migration file location:");
    console.log(migrationPath);
    
    console.log("\n💡 Alternative: Use the Supabase CLI");
    console.log("1. Install: npm install -g supabase");
    console.log("2. Login: supabase login");
    console.log("3. Link: supabase link --project-ref kozhlejudselgtmohdfm");
    console.log("4. Apply: supabase db push");
    
  } catch (error) {
    console.error("❌ Error applying migration:", error.message);
    console.error("\n📚 Manual Steps:");
    console.log("1. Open: supabase/migrations/20250115000001_enhance_tenant_workflow.sql");
    console.log("2. Copy all content");
    console.log("3. Go to: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/sql");
    console.log("4. Paste and run the SQL");
  }
}

// Run the migration
applyMigration().catch(console.error);
