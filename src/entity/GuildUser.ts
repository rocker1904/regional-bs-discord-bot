/* eslint-disable new-cap */
import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn} from 'typeorm';
import { GainsCommandData } from './GainsCommandData';

@Entity()
export class GuildUser extends BaseEntity {

    @PrimaryColumn()
    public discordID!: string;

    @Column({unique: true})
    public scoreSaberID!: string;

    @OneToOne(() => GainsCommandData, gainsData => gainsData.guildUser)
    @JoinColumn()
    public gainsData!: GainsCommandData;


}
