# Authentication & Security Features

## Overview
This document describes the authentication, authorization, and security features added to the AI Resume Analyzer backend.

## Features Implemented

### 1. Authentication Module

#### User Entity
- **Fields:**
  - `id`: UUID (primary key)
  - `email`: Unique email address
  - `name`: User's full name
  - `password`: Hashed password (nullable, for email/password login)
  - `googleId`: Google OAuth ID (nullable)
  - `avatar`: Profile picture URL (nullable)
  - `createdAt`: Account creation timestamp
  - `updatedAt`: Last update timestamp
  - `analyses`: One-to-many relationship with ResumeAnalysis

#### Authentication Endpoints

##### POST /auth/register
Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null
  }
}
```

**Error Responses:**
- `409 Conflict`: Email already exists
- `400 Bad Request`: Validation errors

##### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials

##### GET /auth/google
Initiates Google OAuth flow. Redirects to Google login page.

##### GET /auth/google/callback
Handles Google OAuth callback. Automatically creates user if not exists.
Redirects to frontend with token:
```
${FRONTEND_URL}/auth/callback?token=JWT_TOKEN&name=NAME&email=EMAIL
```

##### GET /auth/me
Get current user information (protected route).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

##### POST /auth/logout
Logout endpoint (JWT is stateless, so this just returns success).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 2. Protected Resume Endpoints

All resume endpoints now require JWT authentication via `Authorization: Bearer <token>` header.

#### POST /resume/analyze
- **Rate Limit:** 3 requests per minute per user
- **Authentication:** Required
- **File Validation:**
  - PDF only
  - Max 5MB
  - Minimum 100 characters of text content
- **User Isolation:** Analysis is saved with userId

#### GET /resume/history
- **Authentication:** Required
- **User Isolation:** Only returns analyses belonging to the authenticated user

#### GET /resume/history/:id
- **Authentication:** Required
- **User Isolation:** Only returns analysis if it belongs to the authenticated user

#### DELETE /resume/history/:id
- **Authentication:** Required
- **User Isolation:** Only deletes analysis if it belongs to the authenticated user

### 3. Rate Limiting

#### Global Rate Limiting
- **Limit:** 10 requests per minute per IP
- **Applies to:** All endpoints

#### Analyze Endpoint Rate Limiting
- **Limit:** 3 resume analyses per minute per IP
- **Applies to:** POST /resume/analyze only

### 4. Security Features

#### Password Security
- Passwords are hashed using bcryptjs with 10 salt rounds
- Passwords are never stored in plain text
- Passwords are never returned in API responses

#### JWT Security
- Tokens expire after 7 days (configurable via JWT_EXPIRES_IN)
- Tokens are signed with a secret key (JWT_SECRET)
- Tokens contain user ID and email
- Token validation on every protected request

#### File Validation
- Only PDF files are accepted
- Maximum file size: 5MB
- PDF must contain at least 100 characters of text
- Clear error message for image-based PDFs

#### CORS Configuration
- Configured for localhost development
- Supports credentials
- Configurable frontend URL via environment variable

### 5. Database Schema Updates

#### ResumeAnalysis Entity
Added fields:
- `userId`: Foreign key to User entity
- `user`: Many-to-one relationship with User entity

All existing fields remain unchanged.

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:4200
```

## Setup Instructions

### 1. Install Dependencies
All required packages are already installed:
- @nestjs/jwt
- @nestjs/passport
- passport
- passport-jwt
- passport-google-oauth20
- bcryptjs
- @nestjs/throttler
- Type definitions for all above

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the values:
- Generate a strong JWT_SECRET (use a random string generator)
- Set up Google OAuth credentials at https://console.cloud.google.com/
- Configure your frontend URL

### 3. Database Migration
TypeORM will automatically create the new `users` table and update the `resume_analyses` table with the `userId` column when you start the application (synchronize: true).

**For production:** Set `synchronize: false` and use proper migrations.

### 4. Google OAuth Setup
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Access Protected Endpoint
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Analyze Resume (Protected)
```bash
curl -X POST http://localhost:3000/resume/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@path/to/resume.pdf" \
  -F "jobDescription=Software Engineer position..."
```

## Migration Notes

### Existing Data
If you have existing resume analyses in the database without a userId, you have two options:

1. **Delete existing data** (recommended for development):
   ```sql
   TRUNCATE TABLE resume_analyses CASCADE;
   ```

2. **Assign to a default user** (for production):
   ```sql
   -- Create a default user first
   INSERT INTO users (id, email, name, password) 
   VALUES ('default-uuid', 'default@example.com', 'Default User', 'hashed_password');
   
   -- Update existing analyses
   UPDATE resume_analyses SET "userId" = 'default-uuid' WHERE "userId" IS NULL;
   ```

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong JWT_SECRET** - At least 32 random characters
3. **Enable HTTPS in production** - Use SSL/TLS certificates
4. **Set synchronize: false in production** - Use proper migrations
5. **Regularly rotate JWT_SECRET** - Invalidates all existing tokens
6. **Monitor rate limiting** - Adjust limits based on usage patterns
7. **Implement refresh tokens** - For better security (future enhancement)

## Backward Compatibility

All existing functionality is preserved:
- Resume analysis logic unchanged
- Response formats unchanged
- Error handling unchanged
- File validation enhanced (added text content check)

The only breaking change is that all resume endpoints now require authentication.

## Future Enhancements

Potential improvements:
- Refresh token mechanism
- Email verification
- Password reset functionality
- Two-factor authentication
- Role-based access control (admin/user)
- API key authentication for integrations
- Session management
- Account deletion
- Profile picture upload
