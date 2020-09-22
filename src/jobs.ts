import { Job } from './models';

interface JobsMap {
  [uuid: string]: Job<any>;
}

class JobRegistry {
  private readonly jobs: JobsMap = {};

  public getJob(uuid: string): Job<any> | null {
    if (!this.jobs.hasOwnProperty(uuid)) {
      return null;
    }
    return this.jobs[uuid];
  }

  public register(job: Job<any>) {
    if (this.jobs.hasOwnProperty(job.getUUID())) {
      throw new Error('Job is already registered');
    }

    this.jobs[job.getUUID()] = job;
  }

}

export const registry = new JobRegistry();
