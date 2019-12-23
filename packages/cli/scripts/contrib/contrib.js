const commander = require('commander');
const path = require('path');
const spawn = require('cross-spawn');
const packageJson = require('../../package.json');
const VARIABLES = require('../../config/variables.config');
const chalk = require('chalk');
const {
    getPlaykitPackages, contribTypes, contribTypesValues,
    chooseTagAndStrategy, installPackages
} = require('./shared-helpers');

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .option(
        '--type <latest|next|local>',
        'choose a type of the contrib script'
    )
    .option(
        '--add',
        'add a new playkit library to the project'
    )
    .parse(process.argv);

(async () => {
    if (program.add) {
        return require('./add');
    }

    if (!program.type || !contribTypesValues.includes(program.type)) {
        return console.error(`
        ${chalk.red('Please, provide one of the correct parameter for the contrib script.')}
            
            You could add playkit library to the project by running:
                --add
            
            For example: kcontrib contrib --add
        
        
            Provide type parameter to update playkit libraries.
            Types could be:
                - ${contribTypes.LATEST}
                - ${contribTypes.NEXT}
                - ${contribTypes.LOCAL}
                
            For example: kcontrib contrib --type=local
    `);
    }

    const {installStrategy, npmTag} = chooseTagAndStrategy(program.type);

    const packages = getPlaykitPackages()
        .map(packageName => `${packageName}${npmTag}`);

    const packagesSummary = packages.map(packageName => `- ${packageName}\n`).join('');

    if (program.type === contribTypes.LOCAL) {
        console.log(chalk` {blue.bold The following packages will be linked to local libraries:}
${packagesSummary}
{blue In case of error, you should run 'npm run setup' in the contrib repository.}
`);
    } else {
        console.log(chalk` {blue.bold The following packages will be re-installed from npm:}
${packagesSummary}`);
    }

    installPackages(installStrategy, packages);
})();
