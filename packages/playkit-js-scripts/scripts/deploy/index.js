const commander = require('commander');
const chalk = require('chalk');

const program = new commander.Command('deploy')
    .option(
        '--prepare',
        'prepare deploy'
    )
    .option(
        '--publish',
        'publish current version'
    )
    .parse(process.argv);

(async () => {
    if (program.prepare) {
        return require('./deploy-prepare');
    }
    if (program.publish) {
        return require('./deploy-publish');
    }
    return console.error(`
        ${chalk.red('Please, provide one of the correct parameter for the deploy script:')}
        --prepare
        --publish
        `);
})()
