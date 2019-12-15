const path = require('path');
const spawn = require('cross-spawn');
const packageJson = require('../package.json');
const VARIABLES = require('../config/variables.config');
const chalk = require('chalk');
const {exec} = require('child_process');
const {getPlaykitPackages} = require('../utils');
const prompts = require('prompts');

const contribTypes = {
    LATEST: 'latest',
    NEXT: 'next',
    LOCAL: 'local',
};

const contribTypesValues = Object.keys(contribTypes).map(key => contribTypes[key]);

(async() => {
    const currentPackages = getPlaykitPackages();
    const allPackages = await getAllPackages();
    const packagesForFetch = allPackages.map(data => data.name);

    console.log('Currently installed packages are:\n', currentPackages.map(packageName => `- ${packageName}\n`).join(''));

    const availableForInstall = packagesForFetch.filter(packageName => !currentPackages.includes(packageName));

    if(!availableForInstall.length) {
        return console.log('All available packages already installed!');
    }

    console.log('Available For Install:: ', availableForInstall);

    const result = await askForInstall(availableForInstall);

    console.log('result', result);

})();

function getAllPackages() {
    return new Promise((resolve, reject) => {
        exec(`npm search --no-description --json ${VARIABLES.CONTRIB}/`, (error, data) => {
            if (error) {
                console.error(
                    `Error while searching packages ${VARIABLES.CONTRIB}/`
                );
                reject(error);
            }
            resolve(JSON.parse(data));
        });
    });
}

async function askForInstall(packagesForInstall) {
    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const choosePackages = {
        type: 'multiselect',
        name: 'packages',
        message: `Choose packages for install:`,
        choices: packagesForInstall.map(packageName => ({title: packageName, value: packageName})),
        min: 1,
    };

    const chooseTag = {
        type: 'select',
        name: 'tag',
        message: `Choose tag for packages to be installed:`,
        choices: contribTypesValues,
    };

    return await prompts([choosePackages, chooseTag], {onCancel});
}
