/* eslint-disable new-cap */
import {BaseEntity, Column, Entity, OneToOne, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
import { GuildUser } from './GuildUser';

@Entity()
export class GainsCommandData extends BaseEntity {

    @PrimaryGeneratedColumn()
    public gainsID!: number;

    @Column()
    public globalRank!: number;

    @Column()
    public time!: Date;

    @Column()
    public pp!: number;

    @OneToOne(() => GuildUser, guildUser => guildUser.gainsData)
    guildUser!: GuildUser;
}
