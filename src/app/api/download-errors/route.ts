import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { JobManager } from '@/lib/job-manager';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    // Get failed CSV path from job manager
    const failedCsvPath = JobManager.getFailedCsvPath(jobId);
    
    if (!failedCsvPath || !existsSync(failedCsvPath)) {
      return NextResponse.json(
        { error: 'No failed records file found for this job' },
        { status: 404 }
      );
    }

    // Read the failed records CSV file
    const fileBuffer = await readFile(failedCsvPath);
    const fileName = `failed_records_${jobId}.csv`;

    // Return file as download
    return new NextResponse(fileBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Download errors API error:', error);
    return NextResponse.json(
      { error: 'Failed to download error file' },
      { status: 500 }
    );
  }
});