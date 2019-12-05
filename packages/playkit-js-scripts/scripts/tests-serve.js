const commander = require('commander');
const path = require('path');
const spawn = require('cross-spawn');
const fs = require('fs-extra');

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

    if(!isFilesExist) {
        createConfigFiles(appTestFolder);
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
