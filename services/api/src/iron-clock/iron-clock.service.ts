import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureService } from '@/manufacture/manufacture.service';

@Injectable()
export class IronClockService implements OnModuleInit, OnModuleDestroy {
  private _tasks :Map<string, CronJob> = new Map();

  constructor(
    private readonly _manufactureService :ManufactureService,
    private readonly _schedulerRegistry :SchedulerRegistry,
    @InjectRepository(SchedulerEntity)
    private readonly _repoScheduler :Repository<SchedulerEntity>,
  ) {}

  async onModuleInit() {
    await this.loadTasksFromDB();
  }

  onModuleDestroy() {
    // Stop all jobs to avoid memory leaks
    this._tasks.forEach((job) => job.stop());
  }

  /**
   * Load all tasks from the database on startup.
   */
  private async loadTasksFromDB() {
    const tasks = await this._repoScheduler.find({
      where: {
        isActive: true,
      },
      relations: [ 'building', 'manufacture' ],
    });
    for (const task of tasks) {
      this.addCronJob(task);
    }
  }

  /**
   * Add a new cron job dynamically.
   */
  public addCronJob(task :SchedulerEntity) :void {
    const id = task.sid;
    if (this._tasks.has(id)) {
      throw new Error(`Task with ID ${id} already exists`);
    }
    if (!task.isActive) {
      throw new Error(`Task with ID ${id} is not active`);
    }
    if (!task.building || !task.manufacture) {
      throw new Error(`Task with ID ${id} is missing building or manufacture`);
    }

    const job = new CronJob(task.cron, () => {
      this._manufactureService.addBuildingToQueue(task.manufacture!.mid, task.building.bid);
    });

    this._schedulerRegistry.addCronJob(id, job);
    job.start();
    this._tasks.set(id, job);
  }

  /**
   * Remove a cron job dynamically.
   */
  public removeCronJob(id :string) :void {
    const job = this._tasks.get(id);
    if (!job) {
      throw new Error(`Task with ID ${id} does not exist`);
    }

    // Stop job and remove it from registry
    job.stop();
    this._schedulerRegistry.deleteCronJob(id);
    this._tasks.delete(id);
  }

  /**
   * Get the current list of tasks for debugging purposes.
   */
  public get tasks() :string[] {
    return [ ...this._tasks.keys() ];
  }
}
