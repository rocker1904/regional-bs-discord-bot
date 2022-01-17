/* eslint-disable new-cap */
import {BaseEntity, Column, Entity, PrimaryColumn} from 'typeorm';

@Entity()
export class User extends BaseEntity {
    @PrimaryColumn()
    public discordID!: string;

    @Column({unique: true})
    public scoreSaberID!: string;
}
