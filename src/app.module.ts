import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ResumeModule } from './resume/resume.module';
import { GroqModule } from './groq/groq.module';
import { AuthModule } from './auth/auth.module';

@Controller()
class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'AI Resume Analyzer API is running',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          google: 'GET /auth/google',
          me: 'GET /auth/me (protected)',
          logout: 'POST /auth/logout',
        },
        resume: {
          analyze: 'POST /resume/analyze (protected)',
          history: 'GET /resume/history (protected)',
          historyById: 'GET /resume/history/:id (protected)',
          deleteHistory: 'DELETE /resume/history/:id (protected)',
        },
      },
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // Set to false in production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      logging: process.env.NODE_ENV !== 'production',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute globally
      },
    ]),
    AuthModule,
    ResumeModule,
    GroqModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
