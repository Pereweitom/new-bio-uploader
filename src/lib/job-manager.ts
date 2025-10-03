import { v4 as uuidv4 } from 'uuid';
import { JobProgress } from './types';
import { CsvProcessor } from './csv-processor';

export interface Job {
  id: string;
  processor: CsvProcessor;
  progress: JobProgress;
  createdAt: Date;
  completedAt?: Date;
}

export class JobManager {
  private static jobs = new Map<string, Job>();
  private static readonly JOB_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new processing job
   */
  static createJob(options: any = {}): Job {
    const jobId = uuidv4();
    console.log(`🆔 Creating job with ID: ${jobId}`);
    
    const processor = new CsvProcessor(jobId, {
      ...options,
      onProgress: (progress: JobProgress) => {
        const job = this.jobs.get(jobId);
        if (job) {
          job.progress = progress;
          console.log(`📊 Progress update for job ${jobId}: ${progress.progress}% - ${progress.message}`);
          
          // Mark job as completed when processing is done
          if (progress.isComplete && !job.completedAt) {
            job.completedAt = new Date();
            
            // Schedule cleanup after some time
            setTimeout(() => {
              this.cleanupJob(jobId);
            }, this.JOB_CLEANUP_INTERVAL);
          }
        }
      }
    });

    const job: Job = {
      id: jobId,
      processor,
      progress: processor.getProgress(),
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    console.log(`✅ Job ${jobId} created and stored. Total jobs: ${this.jobs.size}`);
    return job;
  }

  /**
   * Get job by ID
   */
  static getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job progress by ID
   */
  static getJobProgress(jobId: string): JobProgress | undefined {
    const job = this.jobs.get(jobId);
    console.log(`🔍 Looking for job ${jobId}: ${job ? 'FOUND' : 'NOT FOUND'}. Total jobs: ${this.jobs.size}`);
    if (!job) {
      console.log(`📋 Available job IDs: ${Array.from(this.jobs.keys()).join(', ')}`);
    }
    return job?.progress;
  }

  /**
   * Cancel a job
   */
  static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && !job.progress.isComplete) {
      job.processor.cancel();
      return true;
    }
    return false;
  }

  /**
   * Get failed records CSV path for a job
   */
  static getFailedCsvPath(jobId: string): string | undefined {
    const job = this.jobs.get(jobId);
    return job?.processor.getFailedCsvPath();
  }

  /**
   * Clean up completed job
   */
  static cleanupJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.completedAt) {
      // Clean up temp files
      try {
        const fs = require('fs');
        const failedCsvPath = job.processor.getFailedCsvPath();
        if (fs.existsSync(failedCsvPath)) {
          fs.unlinkSync(failedCsvPath);
        }
      } catch (error) {
        console.error(`Failed to cleanup files for job ${jobId}:`, error);
      }

      this.jobs.delete(jobId);
    }
  }

  /**
   * Get all active jobs (for monitoring)
   */
  static getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job => !job.progress.isComplete);
  }

  /**
   * Get completed jobs
   */
  static getCompletedJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.progress.isComplete);
  }

  /**
   * Clean up old jobs periodically
   */
  static startCleanupScheduler(): void {
    setInterval(() => {
      const now = new Date();
      const jobs = Array.from(this.jobs.entries());

      for (const [jobId, job] of jobs) {
        if (job.completedAt) {
          const timeSinceCompletion = now.getTime() - job.completedAt.getTime();
          if (timeSinceCompletion > this.JOB_CLEANUP_INTERVAL) {
            this.cleanupJob(jobId);
          }
        } else {
          // Clean up stuck jobs older than 2 hours
          const timeSinceCreation = now.getTime() - job.createdAt.getTime();
          if (timeSinceCreation > 2 * 60 * 60 * 1000) {
            console.warn(`Cleaning up stuck job ${jobId}`);
            this.cleanupJob(jobId);
          }
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

// Start the cleanup scheduler when the module is loaded
JobManager.startCleanupScheduler();
