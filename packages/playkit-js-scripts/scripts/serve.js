const path = require('path');
const paths = require('../config/paths');
const fs = require('fs-extra');
const prompts = require('prompts');
const os = require('os');

const modes = {
    userType: ['annonymous', 'widgetId', 'ks'],
    bundler: ['custom', 'uiconf'],
    serverEnv: ['qa', 'production'],
    bundlerEnv: ['qa', 'production'],
};

const modesTypes = Object.keys(modes);

async function modeSelection() {
    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const chooseModes = modesTypes.map(mode => ({
        type: "select",
        name: mode,
        message: `Choose ${mode}:`,
        choices: modes[mode].map(value => ({title: value, value})),
        initial: 0,
    }));

    return await prompts(chooseModes, {onCancel});
}

(async () => {
    const isFilesExist = [paths.appConfig, paths.appEnv].map(file => fs.existsSync(file)).every(Boolean);

    if (!isFilesExist) {
        const modes = await modeSelection();
        createConfigFiles(paths.appTest, modes);
    }

    require('./start');
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


