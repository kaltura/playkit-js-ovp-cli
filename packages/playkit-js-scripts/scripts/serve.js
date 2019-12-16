const path = require('path');
const paths = require('../config/paths');
const fs = require('fs-extra');
const prompts = require('prompts');
const os = require('os');
const { runScript } = require('../utils');
const VARIABLES = require('../config/variables.config');


async function modeSelection() {
    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const chooseModes = VARIABLES.modesTypes.map(mode => ({
        type: "select",
        name: mode,
        message: `Choose ${mode}:`,
        choices: VARIABLES.modes[mode].map(value => ({title: value, value})),
        initial: 0,
    }));

    return await prompts(chooseModes, {onCancel});
}

(async () => {
    const runStart = () => require('./start');
    const isFilesExist = [paths.appConfig, paths.appEnv].map(file => fs.existsSync(file)).every(Boolean);

    if (!isFilesExist) {
        const modes = await modeSelection();
        createConfigFiles(paths.appTest, modes);

        return runScript(path.resolve(__dirname, './update-client.js'), runStart);
    }

    runStart();
})();

function createConfigFiles(appTestFolder, modes) {
    const configFilePath = path.resolve(__dirname, '../config/config.json');
    const readmeFilePath = path.resolve(__dirname, '../config/readme.md');
    const envFile = require(path.resolve(__dirname, '../config/env.json'));

    envFile.modes = modes;

    fs.writeFileSync(
        path.join(appTestFolder, 'env.json'),
        JSON.stringify(envFile, null, 2) + os.EOL
    );

    [readmeFilePath, configFilePath].forEach(file => fs.copyFileSync(file, `${appTestFolder}/${path.basename(file)}`));

    console.log(`Config files were created successfully.
    For more info read the Readme at test/readme.md
    `);
}


