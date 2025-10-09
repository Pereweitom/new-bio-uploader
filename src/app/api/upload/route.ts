import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { withAuth } from '@/lib/auth';
import { JobManager } from '@/lib/job-manager';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('csvFile') as File;
    const dryRun = formData.get('dryRun') === 'true';
    const batchSize = parseInt(formData.get('batchSize') as string) || parseInt(process.env.BATCH_SIZE || '500');

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || '209715200'); // 200MB default
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    await writeFile(filePath, buffer);

    // Create processing job
    const job = JobManager.createJob({
      dryRun,
      batchSize
    });

    console.log(`📤 Upload API created job: ${job.id}, starting processing in 2 seconds...`);

    // Start processing asynchronously with minimal delay to allow UI to connect
    setTimeout(() => {
      console.log(`⏰ Starting processing for job: ${job.id}`);
      job.processor.processFile(filePath).catch(error => {
        console.error(`Job ${job.id} failed:`, error);
        // Update job progress to reflect error
        job.progress.isComplete = true;
        job.progress.message = `Processing failed: ${error.message}`;
      });
    }, 2000); // 2 second delay to let UI load and connect

    console.log(`📤 Returning job ID to client: ${job.id}`);
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: dryRun ? 'Dry run started' : 'Upload processing started'
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
});