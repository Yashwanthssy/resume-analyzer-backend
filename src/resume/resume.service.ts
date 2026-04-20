import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const pdfParse = require('pdf-parse');
import { ResumeAnalysis } from './entities/resume-analysis.entity';
import { GroqService } from '../groq/groq.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeAnalysis)
    private resumeRepository: Repository<ResumeAnalysis>,
    private groqService: GroqService,
  ) {}

  async analyzeResume(file: Express.Multer.File, jobDescription: string, userId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!jobDescription || jobDescription.trim() === '') {
      throw new BadRequestException('Job description is required');
    }

    // Extract text from PDF
    let resumeText: string;
    try {
      const pdfData = await pdfParse(file.buffer);
      resumeText = pdfData.text;

      // Validate PDF has sufficient text content
      if (!resumeText || resumeText.trim().length < 100) {
        throw new BadRequestException(
          'Your PDF appears to be image-based or empty. Please use a text-based PDF.'
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse PDF file');
    }

    // Analyze with Groq AI
    const analysisResult = await this.groqService.analyzeResume(resumeText, jobDescription);

    // Save to database
    const analysis = this.resumeRepository.create({
      fileName: file.originalname,
      jobDescription,
      analysisResult,
      userId,
    });

    const savedAnalysis = await this.resumeRepository.save(analysis);

    return {
      success: true,
      data: {
        id: savedAnalysis.id,
        fileName: savedAnalysis.fileName,
        matchScore: analysisResult.matchScore,
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        missingKeywords: analysisResult.missingKeywords,
        suggestions: analysisResult.suggestions,
        verdict: analysisResult.verdict,
      },
    };
  }

  async getHistory(userId: string) {
    const analyses = await this.resumeRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return analyses.map(analysis => ({
      id: analysis.id,
      fileName: analysis.fileName,
      score: analysis.analysisResult.matchScore,
      createdAt: analysis.createdAt,
    }));
  }

  async getAnalysisById(id: string, userId: string) {
    const analysis = await this.resumeRepository.findOne({ 
      where: { id, userId } 
    });
    
    if (!analysis) {
      throw new BadRequestException('Analysis not found');
    }

    return {
      id: analysis.id,
      fileName: analysis.fileName,
      jobDescription: analysis.jobDescription,
      ...analysis.analysisResult,
      createdAt: analysis.createdAt,
    };
  }

  async deleteAnalysis(id: string, userId: string) {
    const result = await this.resumeRepository.delete({ id, userId });
    
    if (result.affected === 0) {
      throw new BadRequestException('Analysis not found');
    }

    return { success: true, message: 'Analysis deleted successfully' };
  }

  // Guest analysis method (no database save)
  async analyzeResumeGuest(file: Express.Multer.File, jobDescription: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!jobDescription || jobDescription.trim() === '') {
      throw new BadRequestException('Job description is required');
    }

    // Extract text from PDF
    let resumeText: string;
    try {
      const pdfData = await pdfParse(file.buffer);
      resumeText = pdfData.text;

      // Validate PDF has sufficient text content
      if (!resumeText || resumeText.trim().length < 100) {
        throw new BadRequestException(
          'Your PDF appears to be image-based or empty. Please use a text-based PDF.'
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse PDF file');
    }

    // Analyze with Groq AI
    const analysisResult = await this.groqService.analyzeResume(resumeText, jobDescription);

    // Return analysis without saving to database
    return {
      success: true,
      data: {
        id: randomUUID(), // Generate temporary ID for frontend
        fileName: file.originalname,
        matchScore: analysisResult.matchScore,
        summary: analysisResult.summary,
        strengths: analysisResult.strengths,
        missingKeywords: analysisResult.missingKeywords,
        suggestions: analysisResult.suggestions,
        verdict: analysisResult.verdict,
      },
    };
  }

  // Migrate guest data to user account
  async migrateGuestData(guestAnalyses: any[], userId: string) {
    try {
      const analysesToSave = guestAnalyses.map(guestAnalysis => {
        return this.resumeRepository.create({
          fileName: guestAnalysis.fileName,
          jobDescription: guestAnalysis.jobDescription,
          analysisResult: guestAnalysis.analysisResult,
          userId,
          createdAt: new Date(guestAnalysis.createdAt),
        });
      });

      await this.resumeRepository.save(analysesToSave);

      return {
        success: true,
        message: `Successfully migrated ${analysesToSave.length} analyses to your account`,
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw new BadRequestException('Failed to migrate guest data');
    }
  }
}
