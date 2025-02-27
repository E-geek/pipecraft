import {
  BaseEntity, Column,
  CreateDateColumn,
  Entity, Generated,
  ManyToOne, PrimaryColumn,
} from 'typeorm';
import { IBuildingLogLevel, IPieceId, Nullable, Opaque } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingEntity } from './BuildingEntity';
import { BuildingRunConfigEntity } from './BuildingRunConfigEntity';

export interface IQuasiReportEntity {
  message :string;
  bid :bigint | BuildingEntity;
  pids ?:IPieceId[];
  level ?:IBuildingLogLevel | IRunReportLevel;
  runConfig ?:bigint | BuildingRunConfigEntity;
}

export type IRunReportLevel = Opaque<1 | 2 | 4 | 8 | 16, number>;

// Yes, this is additional columns for a Piece, but it can be clear by other ruleset
@Entity({
  comment: 'Every piece has a context of creation. This is important data for debugging and auditing',
  name: 'run_report',
})
export class RunReportEntity extends BaseEntity {

  public static LEVEL_DEBUG  = 1 as IRunReportLevel;
  public static LEVEL_LOG  = 2 as IRunReportLevel;
  public static LEVEL_WARN  = 4 as IRunReportLevel;
  public static LEVEL_ERROR  = 8 as IRunReportLevel;
  public static LEVEL_FATAL  = 16 as IRunReportLevel;

  public static readonly entityLevelToReportLevel :Record<IRunReportLevel, IBuildingLogLevel> = {
    1: 'DEBUG',
    2: 'LOG',
    4: 'WARN',
    8: 'ERROR',
    16: 'FATAL',
  };

  public static readonly reportLevelToEntityLevel :Record<IBuildingLogLevel, IRunReportLevel> = {
    DEBUG: 1 as IRunReportLevel,
    LOG: 2 as IRunReportLevel,
    WARN: 4 as IRunReportLevel,
    ERROR: 8 as IRunReportLevel,
    FATAL: 16 as IRunReportLevel,
  };

  constructor(props ?:Partial<RunReportEntity>) {
    super();
    Object.assign(this, props);
  }

  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  rrid :bigint;

  @ManyToOne(() => BuildingEntity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  building :BuildingEntity;

  @ManyToOne(() => BuildingRunConfigEntity, (buildingRunConfig) => buildingRunConfig.runReport)
  buildingRunConfig :BuildingRunConfigEntity;

  @Column({
    type: 'bigint',
    array: true,
    nullable: true,
    default: null,
  })
  pids :Nullable<IPieceId[]>;

  @Column({
    type: 'smallint',
    default: 2,
  })
  level :number;

  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'text',
    nullable: false,
  })
  message :string;

  public static prepare(reports :(IQuasiReportEntity)[]) :RunReportEntity[] {
    const out = [];
    for (const report of reports) {
      if (!report.message?.length) {
        continue;
      }
      const metaReport :Partial<RunReportEntity> = {
        message: report.message,
        pids: report.pids?.length ? report.pids : null,
      };
      if (report.level) {
        if (typeof report.level === 'number') {
          metaReport.level = report.level;
        } else {
          metaReport.level = RunReportEntity.reportLevelToEntityLevel[report.level];
        }
      }
      if (report.bid) {
        metaReport.building = report.bid as BuildingEntity;
      }
      if (report.runConfig) {
        metaReport.buildingRunConfig = report.runConfig as BuildingRunConfigEntity;
      }
      out.push(new RunReportEntity(metaReport));
    }
    return out;
  }
}
