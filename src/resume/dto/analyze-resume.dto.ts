import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeResumeDto {
  @IsNotEmpty({ message: 'Job description is required' })
  @IsString()
  jobDescription: string;
}
