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

}

export const registry = new JobRegistry();
