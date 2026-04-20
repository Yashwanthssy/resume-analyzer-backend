import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  PayloadTooLargeException,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ResumeService } from './resume.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),   // ← THIS was the missing line
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async analyzeResume(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeResumeDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('File size exceeds 5MB');
    }

    return this.resumeService.analyzeResume(file, dto.jobDescription);
  }

  @Get('history')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getHistory() {
    return this.resumeService.getHistory();
  }

  @Get('history/:id')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getAnalysisById(@Param('id') id: string) {
    return this.resumeService.getAnalysisById(id);
  }

  @Delete('history/:id')
  async deleteAnalysis(@Param('id') id: string) {
    return this.resumeService.deleteAnalysis(id);
  }
}