import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeModule } from './resume/resume.module';
import { GroqModule } from './groq/groq.module';

@Controller()
class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'AI Resume Analyzer API is running',
      timestamp: new Date().toISOString(),
      endpoints: {
        analyze: 'POST /resume/analyze',
        history: 'GET /resume/history',
        historyById: 'GET /resume/history/:id',
        deleteHistory: 'DELETE /resume/history/:id'
      }
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
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
    ResumeModule,
    GroqModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
