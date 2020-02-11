const path = require('path');
const paths = require('../../config/paths');
const fs = require('fs-extra');
const prompts = require('prompts');
const os = require('os');
const VARIABLES = require('../../config/variables.config');
const chalk = require('chalk');


async function modeSelection(initialValues = {}) {
    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const chooseModes = VARIABLES.modesTypes.map(mode => ({
        type: "select",
        name: mode,
        message: `Choose ${mode}:`,
        choices: VARIABLES.modes[mode].map(value => ({title: value, value})),
        initial: initialValues[mode] ? VARIABLES.modes[mode].findIndex(value => value === initialValues[mode]) : 0,
    }));

    return await prompts(chooseModes, {onCancel});
}

(async () => {
    const isEnvExist = fs.existsSync(paths.appEnv);

    if (!isEnvExist) {
        return console.log(chalk.red(`Pleas run '${chalk.bold('kcontrib serve')}' to create the ${path.basename(paths.appEnv)} file.\n`));
    }

    const envJson = require(paths.appEnv);
    const modes = await modeSelection(envJson.modes);
    const updatedEnvJson = {
        ...envJson,
        modes,
    };

    fs.writeFileSync(
        paths.appEnv,
        JSON.stringify(updatedEnvJson, null, 2) + os.EOL
    );

    console.log(chalk.blue(`Modes in the ${path.basename(paths.appEnv)} were successfully updated!`));
})();
