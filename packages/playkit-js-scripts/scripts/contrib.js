const commander = require('commander');
const spawn = require('cross-spawn');
const packageJson = require('../package.json');

//@playkit-js-contrib/


const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .option(
        '--type <update-type>',
        'use a non-standard version of react-scripts'
    )
    .parse(process.argv);

(async () => {
    if (program.type) {
        const appPath = process.cwd();
        const appPackage = require(path.join(appPath, 'package.json'));


        switch (type) {
            case '':
                return;
            default:
                return;
        }

        Object.keys(appPackage.dependencies).reduce((forInstall, dependen), [])

        const child = spawn('npm', args, {
            stdio: 'inherit'
        });
        child.on('close', code => {
            if (code !== 0) {
                reject({
                    command: `${command} ${args.join(' ')}`,
                });
                return;
            }
            resolve();
        });
    }
})();
