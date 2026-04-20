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
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { ResumeService } from './resume.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
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
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('File size exceeds 5MB');
    }

    return this.resumeService.analyzeResume(file, dto.jobDescription, req.user.id);
  }

  @Post('analyze-guest')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // More lenient for guests
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async analyzeResumeGuest(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeResumeDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('File size exceeds 5MB');
    }

    return this.resumeService.analyzeResumeGuest(file, dto.jobDescription);
  }

  @Post('migrate-guest-data')
  @UseGuards(JwtAuthGuard)
  async migrateGuestData(@Body() body: { guestAnalyses: any[] }, @Req() req: any) {
    return this.resumeService.migrateGuestData(body.guestAnalyses, req.user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getHistory(@Req() req: any) {
    return this.resumeService.getHistory(req.user.id);
  }

  @Get('history/:id')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getAnalysisById(@Param('id') id: string, @Req() req: any) {
    return this.resumeService.getAnalysisById(id, req.user.id);
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAnalysis(@Param('id') id: string, @Req() req: any) {
    return this.resumeService.deleteAnalysis(id, req.user.id);
  }
}