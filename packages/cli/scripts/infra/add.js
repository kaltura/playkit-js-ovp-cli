const path = require('path');
const spawn = require('cross-spawn');
const packageJson = require('../../package.json');
const VARIABLES = require('../../config/variables.config');
const chalk = require('chalk');
const {exec} = require('child_process');
const prompts = require('prompts');
const {
    getPlaykitPackages, contribTypes, contribTypesValues,
    chooseTagAndStrategy, installPackages
} = require('./shared-helpers');


(async() => {
    const currentPackages = getPlaykitPackages();
    const packagesForFetch = await getAllPackages();

    console.log('Currently installed packages are:\n', currentPackages.map(packageName => `- ${packageName}\n`).join(''));

    const availableForInstall = packagesForFetch.filter(packageName => !currentPackages.includes(packageName));

    if(!availableForInstall.length) {
        return console.log('All available packages already installed!');
    }

    const {packages, tag} = await askForInstall(availableForInstall);
    const {installStrategy, npmTag} = chooseTagAndStrategy(tag);
    const packagesForInstall = packages.map(packageName => `${packageName}${npmTag}`);

    console.log('Packages will be installed:\n', packagesForInstall.map(packageName => `- ${packageName}\n`).join(''));

    installPackages(installStrategy, packagesForInstall);
})();

function getAllPackages() {
  const ignoreList = [...VARIABLES.CONTRIB_IGNORED_PACKAGES.map(name => `${VARIABLES.CONTRIB}/${name}`)];
  return new Promise((resolve, reject) => {
        exec(`npm search --no-description --json ${VARIABLES.CONTRIB}/`, (error, data) => {
            if (error) {
                console.error(
                    `Error while searching packages ${VARIABLES.CONTRIB}/`
                );
                reject(error);
            }

            const result = JSON.parse(data).map(data => data.name)
              .filter(packageName => !ignoreList.includes(packageName));
            resolve(result);
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
        choices: contribTypesValues.map(contribType => ({title: contribType, value: contribType})),
    };

    return await prompts([choosePackages, chooseTag], {onCancel});
}
