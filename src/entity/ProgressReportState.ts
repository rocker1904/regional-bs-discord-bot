import {BaseEntity, Column, Entity, PrimaryColumn} from 'typeorm';

// Per-guild progress-report state. Absence of a row (or enabled=false) means the
// monthly schedule does NOT fire for that guild — reports are opt-in per guild.
@Entity('progress_report_state')
export class ProgressReportState extends BaseEntity {
    @PrimaryColumn({name: 'guild_id'})
    public guildID!: string;

    @Column({name: 'enabled'})
    public enabled!: boolean;

    @Column({name: 'last_run_at', type: 'timestamptz', nullable: true})
    public lastRunAt!: Date | null;
}
