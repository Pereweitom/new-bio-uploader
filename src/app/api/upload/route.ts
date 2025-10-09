import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { withAuth } from '@/lib/auth';
import { JobManager } from '@/lib/job-manager';
import { testConnection } from '@/lib/database';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    console.log('🚀 Upload API started');
    console.log('🌍 Environment info:', {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      cwd: process.cwd(),
      hasDbUrlLive: !!process.env.DATABASE_URL_LIVE,
      hasDbUrlLocal: !!process.env.DATABASE_URL_LOCAL,
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      tempDir: process.env.TEMP_DIR || './temp'
    });
    
    // Test database connection first
    console.log('Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed in production');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    console.log('✅ Database connection successful');

    console.log('📝 Parsing form data...');
    const formData = await request.formData();
    console.log('✅ Form data parsed successfully');
    const file = formData.get('csvFile') as File;
    const dryRun = formData.get('dryRun') === 'true';
    const batchSize = parseInt(formData.get('batchSize') as string) || parseInt(process.env.BATCH_SIZE || '500');

    console.log('📊 Form data extracted:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      dryRun,
      batchSize
    });

    // Validate file
    if (!file) {
      console.error('❌ No file in form data');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error('❌ Invalid file type:', file.name);
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || '209715200'); // 200MB default
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'max:', maxSize);
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size' },
        { status: 400 }
      );
    }

    console.log('✅ File validation passed');

    // Create uploads directory if it doesn't exist
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';
    console.log('📁 Checking upload directory:', uploadsDir);
    
    if (!existsSync(uploadsDir)) {
      console.log('📁 Creating upload directory...');
      await mkdir(uploadsDir, { recursive: true });
      console.log('✅ Upload directory created');
    }

    // Save uploaded file
    console.log('💾 Saving file...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    console.log('💾 Writing file to:', filePath);
    await writeFile(filePath, buffer);
    console.log('✅ File saved successfully');

    // Create processing job
    console.log('🏗️ Creating processing job...');
    const job = JobManager.createJob({
      dryRun,
      batchSize
    });
    console.log('✅ Job created successfully:', job.id);

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
    
    // Get more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL_LIVE ? 'Present' : 'Missing',
      uploadDir: process.env.UPLOAD_DIR || './uploads'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process upload',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
});