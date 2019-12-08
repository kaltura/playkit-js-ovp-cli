const commander = require('commander');
const path = require('path');
const spawn = require('cross-spawn');
const packageJson = require('../package.json');
const VARIABLES = require('../config/variables.config');
const chalk = require('chalk');

const contribTypes = {
    LATEST: 'latest',
    NEXT: 'next',
    LOCAL: 'local',
};

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .option(
        '--type <latest|next|local>',
        'choose a type of the contrib script'
    )
    .parse(process.argv);

(async () => {
    const contribTypesValues = Object.keys(contribTypes).map(key => contribTypes[key]);

    console.log(`sakal ${program.type} ${process.argv}`);
    if (!program.type || !contribTypesValues.includes(program.type)) {
        return console.error(`
        ${chalk.red('Please, provide the correct type parameter for the contrib script.')}
            Types could be:
                - ${contribTypes.LATEST}
                - ${contribTypes.NEXT}
                - ${contribTypes.LOCAL}
                
            For example: kcontrib contrib --type=local
    `);
    }

    const appPath = process.cwd();
    const appPackage = require(path.join(appPath, 'package.json'));
    let installStrategy = 'install';
    let npmTag = null;


    switch (program.type) {
        case contribTypes.LATEST:
            npmTag = '@latest';
            break;
        case contribTypes.NEXT:
            npmTag = '@next';
            INFO_MESSAGE = `${INFO_MESSAGE}@${contribTypes.NEXT}:`;
            break;
        case contribTypes.LOCAL:
            installStrategy = 'link';
            npmTag = '';
            INFO_MESSAGE = 'The following packages will be linked to local libraries:';
            break;
    }

    const packages = Object.keys(appPackage.dependencies)
        .reduce((forInstall, dependency) => {
            const [_, playkitPackage] = dependency.split(`${VARIABLES.CONTRIB}/`);

            return playkitPackage ? [...forInstall, playkitPackage] : forInstall;
        }, [])
        .map(packageName => `${VARIABLES.CONTRIB}/${packageName}${npmTag}`);

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

    const child = spawn('npm', [installStrategy, ...packages], {
        stdio: 'inherit'
    });

    child.on('close', code => {
        if (code !== 0) {
            console.error(
                `Error while updating packages.`
            );
        }
    });
})();
