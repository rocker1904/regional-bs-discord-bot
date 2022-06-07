import AddUserCommand from './AddUserCommand';
import AmCommand from './AmCommand';
import AmrCommand from './AmrCommand';
import Command from './Command';
import GetCommand from './GetCommand';
import GibPPCommand from './GibPPCommand';
import PingCommand from './PingCommand';
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
        new PingCommand(),
        new RegisterCommand(),
        new RemoveUserCommand(),
        new UnregisterCommand(),
    ];
}

export default Commands.commands;
