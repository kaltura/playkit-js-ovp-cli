const commander = require('commander');
const path = require('path');
const spawn = require('cross-spawn');
const packageJson = require('../package.json');
const VARIABLES = require('../config/variables.config');

const contribTypes = {
    LATEST: 'latest',
    NEXT: 'next',
    LOCAL: 'local',
};

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .option(
        '--type <update-type>',
        'choose a type of the contrib script'
    )
    .parse(process.argv);

(async () => {
    if (program.type) {
        const appPath = process.cwd();
        const appPackage = require(path.join(appPath, 'package.json'));
        let installStrategy = 'install';
        let contribLink = null;


        switch (program.type) {
            case contribTypes.LATEST:
                contribLink = '@latest';
                break;
            case contribTypes.NEXT:
                contribLink = '@next';
                break;
            case contribTypes.LOCAL:
                installStrategy = 'link';
                contribLink = ' --production';
                break;
            default:
                console.error(
                    `Unknown type: ${chalk.green(type)}`
                );
                return;
        }

        const packages = Object.keys(appPackage.dependencies)
            .reduce((forInstall, dependency) => {
                const [_, playkitPackage] = dependency.split(`${VARIABLES.CONTRIB}/`);

                return playkitPackage ? [...forInstall, playkitPackage] : forInstall;
            }, [])
            .map(packageName => `@playkit-js-contrib/${packageName}${contribLink}`);

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
    }
})();
