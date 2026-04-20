import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeAnalysis } from './entities/resume-analysis.entity';
import { GroqModule } from '../groq/groq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeAnalysis]),
    GroqModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
