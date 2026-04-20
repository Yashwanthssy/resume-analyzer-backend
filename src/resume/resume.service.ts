import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const pdfParse = require('pdf-parse');
import { ResumeAnalysis } from './entities/resume-analysis.entity';
import { GroqService } from '../groq/groq.service';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeAnalysis)
    private resumeRepository: Repository<ResumeAnalysis>,
    private groqService: GroqService,
  ) {}

  async analyzeResume(file: Express.Multer.File, jobDescription: string) {
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
    } catch (error) {
      throw new BadRequestException('Failed to parse PDF file');
    }

    // Analyze with Groq AI
    const analysisResult = await this.groqService.analyzeResume(resumeText, jobDescription);

    // Save to database
    const analysis = this.resumeRepository.create({
      fileName: file.originalname,

      
      jobDescription,
      analysisResult,
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

  async getHistory() {
    const analyses = await this.resumeRepository.find({
      order: { createdAt: 'DESC' },
    });

    return analyses.map(analysis => ({
      id: analysis.id,
      fileName: analysis.fileName,
      score: analysis.analysisResult.matchScore,
      createdAt: analysis.createdAt,
    }));
  }

  async getAnalysisById(id: string) {
    const analysis = await this.resumeRepository.findOne({ where: { id } });
    
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

  async deleteAnalysis(id: string) {
    const result = await this.resumeRepository.delete(id);
    
    if (result.affected === 0) {
      throw new BadRequestException('Analysis not found');
    }

    return { success: true, message: 'Analysis deleted successfully' };
  }
}
