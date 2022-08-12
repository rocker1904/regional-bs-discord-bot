import {GuildMember} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import RoleUpdater from '../RoleUpdater';

export default async function onGuildMemberAdd(member: GuildMember): Promise<void> {
    const guildUser = await GuildUser.findOne({where: {discordID: member.id}});
    if (!guildUser) return;

    await RoleUpdater.updateRegionRole(guildUser, member.guild.id);
}
