import AddUserCommand from './AddUserCommand';
import AmCommand from './AmCommand';
import AmrCommand from './AmrCommand';
import Command from './Command';
import GainsCommand from './GainsCommand';
import GetCommand from './GetCommand';
import GibPPCommand from './GibPPCommand';
import ImportProfilesCommand from './ImportProfilesCommand';
import OceRankCommand from './OceRankCommand';
import PingCommand from './PingCommand';
import PPDiffCommand from './PPDiffCommand';
import RegisterCommand from './RegisterCommand';
import RemoveUserCommand from './RemoveUserCommand';
import UnregisterCommand from './UnregisterCommand';

class Commands {
    static commands: Command[] = [
        new AddUserCommand(),
        new AmCommand(),
        new AmrCommand(),
        new GetCommand(),
        new GibPPCommand(),
        new ImportProfilesCommand(),
        new OceRankCommand(),
        new PingCommand(),
        new GainsCommand(),
        new PPDiffCommand(),
        new RegisterCommand(),
        new RemoveUserCommand(),
        new UnregisterCommand(),
    ];
}

export default Commands.commands;
