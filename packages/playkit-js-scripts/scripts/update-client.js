const path = require('path');
const paths = require('../config/paths');
const fs = require('fs-extra');
const prompts = require('prompts');
const chalk = require('chalk');
const VARIABLES = require('../config/variables.config');
const { exec } = require('child_process');

(async () => {
    const isEnvExist = fs.existsSync(paths.appEnv);

    if (!isEnvExist) {
        return console.log(chalk.red(`Pleas run '${chalk.bold('kcontrib serve')}' to create the ${path.basename(paths.appEnv)} file.\n`));
    }

    const data = await getAllTags();

    const playerVersions = data.split('\n')
        .filter(str => new RegExp(VARIABLES.TAG_PATTERN).test(str))
        .map(str => str.match(`${VARIABLES.TAG_PATTERN}(.*)`).pop())
        .sort()
        .reverse();

    console.log('data:::', playerVersions);
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
