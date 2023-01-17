/* eslint-disable new-cap */
import {BaseEntity, Column, Entity, PrimaryColumn} from 'typeorm';

// Storing the counter by name allows for easy expansion to multiple counters later
@Entity()
export class CounterData extends BaseEntity {
    @PrimaryColumn()
    public counterName!: string;

    @Column()
    public time!: Date;
}
