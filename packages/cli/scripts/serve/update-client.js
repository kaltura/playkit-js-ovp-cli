const path = require('path');
const paths = require('../../config/paths');
const fs = require('fs-extra');
const prompts = require('prompts');
const chalk = require('chalk');
const VARIABLES = require('../../config/variables.config');
const {exec} = require('child_process');
const os = require('os');

(async () => {
    const isEnvExist = fs.existsSync(paths.appEnv);

    if (!isEnvExist) {
        return console.log(chalk.red(`Pleas run '${chalk.bold('kcontrib serve')}' to create the ${path.basename(paths.appEnv)} file.\n`));
    }

    const envJson = require(paths.appEnv);
    const data = await getAllTags();
    let chosenVersion;

    const playerVersions = data.split('\n')
        .filter(str => new RegExp(VARIABLES.TAG_PATTERN).test(str))
        .map(str => str.match(`${VARIABLES.TAG_PATTERN}(.*)`).pop())
        .sort()
        .reverse();

    if(!envJson.bundler.customPlayerVersion) {
        chosenVersion = {customPlayerVersion: playerVersions[0]};
        console.log(chalk.yellow(`Setup latest version of the player.`));
    } else {
        chosenVersion = await askUserToChooseVersion(playerVersions, envJson.bundler.customPlayerVersion);
    }

    const updatedEnvJson = {
        ...envJson,
        bundler: {
            ...envJson.bundler,
            ...chosenVersion
        }
    };

    fs.writeFileSync(
        paths.appEnv,
        JSON.stringify(updatedEnvJson, null, 2) + os.EOL
    );

    console.log(chalk.blue(`Version of the player successfully updated!`));
})();


function getAllTags() {
    return new Promise((resolve, reject) => {
        exec(`git ls-remote --tags --refs ${VARIABLES.REPO}`, (error, data) => {
            if (error) {
                console.error(
                    `Error while fetching tags from repo ${VARIABLES.REPO}.`
                );
                reject(error);
            }
            resolve(data)
        });
    });
}

async function askUserToChooseVersion(versions, currentVersion) {
    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const chooseVersion = {
        type: "select",
        name: 'customPlayerVersion',
        message: `Choose the version for the player to use:`,
        choices: versions.map(version => ({title: version, value: version})),
        initial: versions.indexOf(currentVersion) || 0,
    };

    return await prompts(chooseVersion, {onCancel});
}
