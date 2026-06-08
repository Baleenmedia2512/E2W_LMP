import { sendOtpEmail } from '../email/email-service';

interface EmailJob {
  id: string;
  email: string;
  otp: string;
  retries: number;
  timestamp: number;
}

class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  /**
   * Add email to queue for async sending
   */
  async addToQueue(email: string, otp: string): Promise<void> {
    const job: EmailJob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      otp,
      retries: 0,
      timestamp: Date.now(),
    };

    this.queue.push(job);
    console.log(`📥 Email queued for ${email} (Queue size: ${this.queue.length})`);

    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process queue in background
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue[0];
      
      // Safety check
      if (!job) {
        this.queue.shift();
        continue;
      }

      try {
        console.log(`📤 Attempting to send email to ${job.email} (Attempt ${job.retries + 1}/${this.maxRetries})`);
        
        const success = await sendOtpEmail(job.email, job.otp);

        if (success) {
          console.log(`✅ Email sent successfully to ${job.email}`);
          this.queue.shift(); // Remove from queue
        } else {
          throw new Error('Email sending failed');
        }
      } catch (error) {
        console.error(`❌ Failed to send email to ${job.email}:`, error);

        job.retries++;

        if (job.retries >= this.maxRetries) {
          console.error(`🚫 Max retries reached for ${job.email}. Removing from queue.`);
          this.queue.shift(); // Remove failed job
        } else {
          console.log(`🔄 Retrying email to ${job.email} in ${this.retryDelay / 1000} seconds...`);
          // Move to end of queue for retry after delay
          this.queue.shift();
          setTimeout(() => {
            this.queue.push(job);
          }, this.retryDelay);
        }
      }

      // Small delay between processing jobs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
    console.log('✨ Queue processing completed');
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      jobs: this.queue.map(job => ({
        id: job.id,
        email: job.email,
        retries: job.retries,
        timestamp: job.timestamp,
      })),
    };
  }
}

// Singleton instance
const emailQueue = new EmailQueue();

export default emailQueue;
