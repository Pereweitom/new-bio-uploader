import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@/lib/job-manager';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId in request body' },
        { status: 400 }
      );
    }

    // Attempt to cancel the job
    const cancelled = JobManager.cancelJob(jobId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancellation requested'
    });

  } catch (error) {
    console.error('Cancel API error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
});