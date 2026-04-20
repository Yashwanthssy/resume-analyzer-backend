import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('resume_analyses')
export class ResumeAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column('text')
  jobDescription: string;

  @Column('jsonb')
  analysisResult: {
    matchScore: number;
    summary: string;
    strengths: string[];
    missingKeywords: string[];
    suggestions: Array<{
      section: string;
      original: string;
      improved: string;
    }>;
    verdict: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
