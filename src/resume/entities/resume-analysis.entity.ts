import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

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

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.analyses, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
