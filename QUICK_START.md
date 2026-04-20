# Quick Start Guide - Authentication Features

## 🚀 Getting Started in 5 Minutes

### Step 1: Update Environment Variables (1 min)

Open `Backend/.env` and update these values:

```env
# Generate a strong secret (use: openssl rand -base64 32)
JWT_SECRET=your_strong_random_secret_here_at_least_32_characters

# Optional: Only if using Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 2: Handle Existing Data (1 min)

If you have existing resume analyses, choose one:

**Option A: Fresh Start (Development)**
```bash
# Connect to your database and run:
psql $DATABASE_URL -c "TRUNCATE TABLE resume_analyses CASCADE;"
```

**Option B: Keep Data (Production)**
See `MIGRATION_GUIDE.md` for detailed instructions.

### Step 3: Start the Application (1 min)

```bash
cd Backend
npm run start:dev
```

The application will:
- Auto-create the `users` table
- Add `userId` column to `resume_analyses`
- Start on port 3000

### Step 4: Test Authentication (2 min)

#### Register a User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "avatar": null
  }
}
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Test Protected Endpoint
```bash
# Replace YOUR_TOKEN with the token from register/login
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Test Resume Analysis (1 min)

```bash
# Replace YOUR_TOKEN and path/to/resume.pdf
curl -X POST http://localhost:3000/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "resume=@path/to/resume.pdf" \
  -F "jobDescription=Software Engineer with 3+ years experience..."
```

## ✅ You're Done!

Your backend now has:
- ✅ User registration and login
- ✅ JWT authentication
- ✅ Protected resume endpoints
- ✅ User data isolation
- ✅ Rate limiting
- ✅ Enhanced security

## 🔧 Common Issues

### Issue: "JWT_SECRET is not defined"
**Fix:** Set JWT_SECRET in `.env` file

### Issue: "column userId does not exist"
**Fix:** Restart the application (TypeORM will create it)

### Issue: "null value in column userId"
**Fix:** Follow Step 2 to handle existing data

### Issue: "Unauthorized"
**Fix:** Include `Authorization: Bearer <token>` header

## 📚 Next Steps

1. **Frontend Integration**
   - Update frontend to use new auth endpoints
   - Store JWT token in localStorage/sessionStorage
   - Add Authorization header to all API calls

2. **Google OAuth (Optional)**
   - Set up Google Cloud Console project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/auth/google/callback`
   - Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in `.env`

3. **Production Deployment**
   - Change JWT_SECRET to a strong random value
   - Set FRONTEND_URL to your production domain
   - Set `synchronize: false` in TypeORM config
   - Use proper database migrations
   - Enable HTTPS

## 📖 Documentation

- `AUTH_FEATURES.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `MIGRATION_GUIDE.md` - Database migration instructions

## 🆘 Need Help?

Check the logs:
```bash
# Development
npm run start:dev

# Check for errors in console output
```

Verify database:
```bash
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
psql $DATABASE_URL -c "SELECT id, \"fileName\", \"userId\" FROM resume_analyses LIMIT 1;"
```

## 🎯 API Endpoints Summary

### Public Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `GET /auth/google` - Start Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

### Protected Endpoints (Require JWT)
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `POST /resume/analyze` - Analyze resume (3 req/min limit)
- `GET /resume/history` - Get user's analysis history
- `GET /resume/history/:id` - Get specific analysis
- `DELETE /resume/history/:id` - Delete analysis

## 🔐 Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Rate limiting: 10 req/min globally, 3 req/min for analysis
- Users can only access their own data
- All resume endpoints require authentication

## 🧪 Testing Checklist

- [ ] Can register new user
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong credentials
- [ ] Cannot register duplicate email
- [ ] Can access /auth/me with valid token
- [ ] Cannot access /auth/me without token
- [ ] Can analyze resume with valid token
- [ ] Cannot analyze resume without token
- [ ] Can only see own analysis history
- [ ] Can only delete own analyses
- [ ] Rate limiting works (try 4 analyses in 1 minute)

## 💡 Tips

1. **Save your JWT token** - You'll need it for all protected endpoints
2. **Use Postman/Insomnia** - Easier than curl for testing
3. **Check the logs** - Most issues are logged clearly
4. **Read AUTH_FEATURES.md** - Comprehensive documentation
5. **Test incrementally** - Register → Login → Protected endpoint

---

**Ready to go!** 🎉

If everything works, you should be able to:
1. Register/login users
2. Analyze resumes (with authentication)
3. View history (user-specific)
4. Delete analyses (with ownership check)

All existing functionality is preserved, just now with proper authentication and security!
