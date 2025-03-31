import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { CronJob } from 'cron';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { IronClockService } from './iron-clock.service';
import { ManufactureService } from '@/manufacture/manufacture.service';

describe('IronClockService', () => {
  let service :IronClockService;
  let repoScheduler :Repository<SchedulerEntity>;
  let manufactureService :ManufactureService;
  let schedulerRegistry :SchedulerRegistry;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [
        IronClockService,
        {
          provide: getRepositoryToken(SchedulerEntity),
          useClass: Repository,
        },
        {
          provide: ManufactureService,
          useValue: { addBuildingToQueue: jest.fn() },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
            deleteCronJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IronClockService>(IronClockService);
    repoScheduler = module.get<Repository<SchedulerEntity>>(getRepositoryToken(SchedulerEntity));
    manufactureService = module.get<ManufactureService>(ManufactureService);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
  });

  it('should load tasks from the database on module init', async () => {
    const tasks = [
      { sid: '1', isActive: true, cron: '* * * * *', building: { bid: 'b1' }, manufacture: { mid: 'm1' }},
    ];
    jest.spyOn(repoScheduler, 'find').mockResolvedValue(tasks as any);

    await service.onModuleInit();

    expect(repoScheduler.find).toHaveBeenCalled();
    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('1', expect.any(CronJob));
  });

  it('should stop all jobs on module destroy', () => {
    const job = { stop: jest.fn() } as any;
    service['_tasks'].set('1', job);

    service.onModuleDestroy();

    expect(job.stop).toHaveBeenCalled();
  });

  it('should add a new cron job', () => {
    const task = { sid: '1', isActive: true, cron: '* * * * *', building: { bid: 'b1' }, manufacture: { mid: 'm1' }} as unknown as SchedulerEntity;

    service.addCronJob(task);

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('1', expect.any(CronJob));
    expect(service.tasks).toContain('1');
  });

  it('should throw an error when adding a duplicate cron job', () => {
    const task = { sid: '1', isActive: true, cron: '* * * * *', building: { bid: 'b1' }, manufacture: { mid: 'm1' }} as unknown as SchedulerEntity;
    service.addCronJob(task);

    expect(() => service.addCronJob(task)).toThrowError('Task with ID 1 already exists');
  });

  it('should remove a cron job', () => {
    const job = { stop: jest.fn() } as any;
    service['_tasks'].set('1', job);

    service.removeCronJob('1');

    expect(job.stop).toHaveBeenCalled();
    expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('1');
    expect(service.tasks).not.toContain('1');
  });

  it('should throw an error when removing a non-existent cron job', () => {
    expect(() => service.removeCronJob('non-existent')).toThrowError('Task with ID non-existent does not exist');
  });

  it('should execute the task at 04:15 daily (using fake timers)', async () => {
    const task = { sid: '1', isActive: true, cron: '14 4 * * *', building: { bid: 45n }, manufacture: { mid: 90n }} as unknown as SchedulerEntity;

    // Mock `executeTask` to track calls
    const spyExecuteTask = jest.spyOn(manufactureService, 'addBuildingToQueue');

    // Activate fake timers
    jest.useFakeTimers();

    // Add the cron job
    service.addCronJob(task);

    // Advance timer by 1 day worth of milliseconds
    const oneDayInMs = 24 * 60 * 60 * 1000;
    jest.advanceTimersByTime(oneDayInMs); // Fast-forward to 04:15

    // Assert that the task has executed exactly once
    expect(spyExecuteTask).toHaveBeenCalledTimes(1);
    expect(spyExecuteTask).toHaveBeenCalledWith(45n, 90n);

    // Simulate passing 1 full day
    jest.advanceTimersByTime(oneDayInMs);

    // Now the task should have been executed twice (04:15 yesterday and today)
    expect(spyExecuteTask).toHaveBeenCalledTimes(2);

    // Clean up
    jest.useRealTimers(); // Restore timers
  });
});
