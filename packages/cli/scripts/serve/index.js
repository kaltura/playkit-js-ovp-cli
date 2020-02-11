const commander = require('commander');
const chalk = require('chalk');

const program = new commander.Command('serve')
    .option(
        '--update-modes',
        'update modes and environments'
    )
    .option(
        '--update-player',
        'update version of the player'
    )
    .parse(process.argv);

(async () => {
    if (program.updateModes) {
        return require('./change-modes');
    }
    if (program.updatePlayer) {
        return require('./update-client');
    }

    return require('./serve');
})();
