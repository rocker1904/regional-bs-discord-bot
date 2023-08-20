import AddUserCommand from './AddUserCommand';
import AmCommand from './AmCommand';
import AmrCommand from './AmrCommand';
import Command from './Command';
import CounterCommand from './CounterCommand';
import GainsCommand from './GainsCommand';
import GetCommand from './GetCommand';
import GibPPCommand from './GibPPCommand';
import OceRankCommand from './OceRankCommand';
import PingCommand from './PingCommand';
import PongCommand from './PongCommand';
import PPDiffCommand from './PPDiffCommand';
import ProgressReportCommand from './ProgressReportCommand';
import RegisterCommand from './RegisterCommand';
import RemoveUserCommand from './RemoveUserCommand';
import RoleUpdateCommand from './RoleUpdateCommand';
import UnregisterCommand from './UnregisterCommand';

class Commands {
    static commands: Command[] = [
        new AddUserCommand(),
        new AmCommand(),
        new AmrCommand(),
        new CounterCommand(),
        new GainsCommand(),
        new GetCommand(),
        new GibPPCommand(),
        new OceRankCommand(),
        new PingCommand(),
        new PongCommand(),
        new PPDiffCommand(),
        new ProgressReportCommand(),
        new RegisterCommand(),
        new RemoveUserCommand(),
        new RoleUpdateCommand(),
        new UnregisterCommand(),
    ];
}

export default Commands.commands;
