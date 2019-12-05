const commander = require('commander');
const path = require('path');
const spawn = require('cross-spawn');
const fs = require('fs-extra');
const prompts = require('prompts');

const modes = {
    userType: ['annonymous', 'widgetId', 'ks'],
    bundler: ['custom', 'uiconf'],
    serverEnv: ['qa', 'production'],
    bundlerEnv: ['qa', 'production'],
};

const modesTypes = Object.keys(modes);

async function modeSelection() {
    const onCancel = prompt => {
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
    const appPath = process.cwd();
    const appTestFolder = `${appPath}/test`;
    const appConfigPath = path.join(appTestFolder, 'config.json');
    const appEnvPath = path.join(appTestFolder, 'env.json');
    let isFilesExist = false;

    try {
        isFilesExist = [appConfigPath, appEnvPath].map(file => fs.existsSync(file)).every(Boolean);
    } catch (e) {
        console.error('Error while reading files paths.');
    }

    if (!isFilesExist) {
        const result = await modeSelection();
        // createConfigFiles(appTestFolder);
    }
})();

function createConfigFiles(appTestFolder) {
    const configFilePath = path.resolve(__dirname, '../config/config.json');
    const envFilePath = path.resolve(__dirname, '../config/env.json');

    [configFilePath, envFilePath].map(file => fs.copyFile(file, `${appTestFolder}/${path.basename(file)}`,
        (error) => error
            ? console.error('Error while file transferring: ', error)
            : console.log(`Config file ${path.basename(file)} was transferred successful.`)
    ));
}


