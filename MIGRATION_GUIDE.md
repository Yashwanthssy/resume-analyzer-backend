# Database Migration Guide

## Overview
This guide helps you migrate existing resume analysis data to work with the new authentication system.

## The Issue
The new authentication system adds a `userId` column to the `resume_analyses` table with a NOT NULL constraint. If you have existing data, you need to handle it before starting the updated application.

## Migration Options

### Option 1: Fresh Start (Recommended for Development)

If you're in development and don't need to preserve existing data:

```sql
-- Connect to your database and run:
TRUNCATE TABLE resume_analyses CASCADE;
```

This will delete all existing resume analyses and allow the application to start fresh with the new schema.

### Option 2: Assign to Default User (Recommended for Production)

If you need to preserve existing data:

#### Step 1: Create a default/system user

```sql
-- Create a system user to own existing analyses
INSERT INTO users (
  id, 
  email, 
  name, 
  password,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'system@resumeanalyzer.com',
  'System User',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to hash a password
  NOW(),
  NOW()
) RETURNING id;
```

#### Step 2: Update existing analyses

```sql
-- Replace 'SYSTEM_USER_ID' with the UUID from Step 1
UPDATE resume_analyses 
SET "userId" = 'SYSTEM_USER_ID' 
WHERE "userId" IS NULL;
```

### Option 3: Manual Migration Script

Create a migration script to handle the transition:

```typescript
// migration.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

async function migrate() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/**/*.entity.ts'],
  });

  await dataSource.initialize();

  // Create system user
  const hashedPassword = await bcrypt.hash('system-password-123', 10);
  const result = await dataSource.query(
    `INSERT INTO users (id, email, name, password, "createdAt", "updatedAt") 
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) 
     RETURNING id`,
    ['system@resumeanalyzer.com', 'System User', hashedPassword]
  );

  const systemUserId = result[0].id;

  // Update existing analyses
  await dataSource.query(
    `UPDATE resume_analyses SET "userId" = $1 WHERE "userId" IS NULL`,
    [systemUserId]
  );

  console.log('Migration completed successfully');
  await dataSource.destroy();
}

migrate().catch(console.error);
```

## Step-by-Step Migration Process

### For Development Environment:

1. **Backup your database** (optional but recommended)
   ```bash
   pg_dump -h your-host -U your-user -d your-db > backup.sql
   ```

2. **Choose migration option** (Option 1 recommended for dev)
   ```sql
   TRUNCATE TABLE resume_analyses CASCADE;
   ```

3. **Start the application**
   ```bash
   npm run start:dev
   ```

4. **Verify tables created**
   - Check that `users` table exists
   - Check that `resume_analyses` has `userId` column

5. **Test authentication**
   - Register a new user
   - Login and get JWT token
   - Test resume analysis with token

### For Production Environment:

1. **Backup your database** (REQUIRED)
   ```bash
   pg_dump -h your-host -U your-user -d your-db > backup_$(date +%Y%m%d).sql
   ```

2. **Set synchronize to false** in `app.module.ts`
   ```typescript
   TypeOrmModule.forRoot({
     // ...
     synchronize: false, // Changed from true
   })
   ```

3. **Create migration file**
   ```bash
   npm run typeorm migration:create -- -n AddUserAuthentication
   ```

4. **Write migration**
   ```typescript
   import { MigrationInterface, QueryRunner } from 'typeorm';
   
   export class AddUserAuthentication1234567890 implements MigrationInterface {
     public async up(queryRunner: QueryRunner): Promise<void> {
       // Create users table
       await queryRunner.query(`
         CREATE TABLE users (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           email VARCHAR NOT NULL UNIQUE,
           name VARCHAR NOT NULL,
           password VARCHAR,
           "googleId" VARCHAR,
           avatar VARCHAR,
           "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
           "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
         )
       `);

       // Create system user
       await queryRunner.query(`
         INSERT INTO users (email, name, password)
         VALUES ('system@resumeanalyzer.com', 'System User', '$2a$10$...')
       `);

       // Add userId column
       await queryRunner.query(`
         ALTER TABLE resume_analyses 
         ADD COLUMN "userId" UUID
       `);

       // Update existing records
       await queryRunner.query(`
         UPDATE resume_analyses 
         SET "userId" = (SELECT id FROM users WHERE email = 'system@resumeanalyzer.com')
       `);

       // Make userId NOT NULL
       await queryRunner.query(`
         ALTER TABLE resume_analyses 
         ALTER COLUMN "userId" SET NOT NULL
       `);

       // Add foreign key
       await queryRunner.query(`
         ALTER TABLE resume_analyses 
         ADD CONSTRAINT "FK_resume_analyses_user" 
         FOREIGN KEY ("userId") REFERENCES users(id)
       `);
     }

     public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`ALTER TABLE resume_analyses DROP CONSTRAINT "FK_resume_analyses_user"`);
       await queryRunner.query(`ALTER TABLE resume_analyses DROP COLUMN "userId"`);
       await queryRunner.query(`DROP TABLE users`);
     }
   }
   ```

5. **Run migration**
   ```bash
   npm run typeorm migration:run
   ```

6. **Verify migration**
   ```sql
   -- Check users table
   SELECT * FROM users;
   
   -- Check resume_analyses has userId
   SELECT id, "fileName", "userId" FROM resume_analyses LIMIT 5;
   
   -- Verify foreign key
   SELECT * FROM resume_analyses WHERE "userId" IS NULL;
   -- Should return 0 rows
   ```

7. **Start application**
   ```bash
   npm run start:prod
   ```

## Verification Checklist

After migration, verify:

- [ ] `users` table exists with correct schema
- [ ] `resume_analyses` table has `userId` column
- [ ] All existing analyses have a valid `userId`
- [ ] Foreign key constraint is in place
- [ ] Application starts without errors
- [ ] Can register new users
- [ ] Can login and get JWT token
- [ ] Can create new resume analyses
- [ ] Can view history (filtered by user)
- [ ] Can delete analyses (with ownership check)

## Rollback Plan

If something goes wrong:

### Development:
```bash
# Restore from backup
psql -h your-host -U your-user -d your-db < backup.sql
```

### Production:
```bash
# Stop application
pm2 stop your-app

# Restore from backup
psql -h your-host -U your-user -d your-db < backup_YYYYMMDD.sql

# Revert to previous code version
git checkout previous-commit

# Restart application
pm2 start your-app
```

## Common Issues

### Issue 1: "column userId does not exist"
**Cause:** Database schema not updated  
**Solution:** Ensure TypeORM synchronize is true or run migrations

### Issue 2: "null value in column userId violates not-null constraint"
**Cause:** Existing data without userId  
**Solution:** Follow Option 2 migration above

### Issue 3: "relation users does not exist"
**Cause:** Users table not created  
**Solution:** Restart application with synchronize: true or run migrations

### Issue 4: "duplicate key value violates unique constraint users_email_key"
**Cause:** Trying to create duplicate system user  
**Solution:** Check if user already exists before creating

## Testing After Migration

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","password":"test123"}'

# 2. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Use token to access protected endpoint
curl -X GET http://localhost:3000/resume/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

If you encounter issues:

1. Check application logs
2. Check database logs
3. Verify environment variables
4. Ensure all dependencies installed
5. Check AUTH_FEATURES.md for detailed documentation

## Important Notes

- Always backup before migration
- Test migration in development first
- Plan for downtime in production
- Have rollback plan ready
- Monitor application after migration
- Verify data integrity after migration
