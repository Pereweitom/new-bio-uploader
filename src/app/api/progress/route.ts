import { NextRequest } from 'next/server';
import { JobManager } from '@/lib/job-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  console.log(`📡 Progress API called with jobId: ${jobId}`);

  if (!jobId) {
    console.log(`❌ Missing jobId parameter`);
    return new Response('Missing jobId parameter', { status: 400 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const initialData = `data: ${JSON.stringify({ 
        type: 'connected', 
        jobId,
        message: 'Connected to progress stream' 
      })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Set up progress monitoring with retry logic
      let retryCount = 0;
      const maxRetries = 10; // Allow up to 10 retries (20 seconds)
      
      const intervalId = setInterval(() => {
        const job = JobManager.getJob(jobId);
        
        if (!job) {
          retryCount++;
          
          if (retryCount >= maxRetries) {
            // Job not found after retries - send error and close
            const errorData = `data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Job not found or expired' 
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
            clearInterval(intervalId);
            return;
          }
          
          // Send waiting message instead of error
          const waitingData = `data: ${JSON.stringify({ 
            type: 'waiting', 
            message: `Initializing job... (${retryCount}/${maxRetries})` 
          })}\n\n`;
          controller.enqueue(encoder.encode(waitingData));
          return;
        }
        
        const progress = job.progress;
        
        // Reset retry count if job is found
        retryCount = 0;

        // Send progress update
        const progressData = `data: ${JSON.stringify({ 
          type: 'progress', 
          ...progress 
        })}\n\n`;
        controller.enqueue(encoder.encode(progressData));

        // Close stream if job is complete
        if (progress.isComplete) {
          const completeData = `data: ${JSON.stringify({ 
            type: 'complete', 
            ...progress 
          })}\n\n`;
          controller.enqueue(encoder.encode(completeData));
          controller.close();
          clearInterval(intervalId);
        }
      }, 1000); // Update every second

      // Clean up on stream close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}