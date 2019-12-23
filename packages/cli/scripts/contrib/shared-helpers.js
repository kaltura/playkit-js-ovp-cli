const paths = require('../../config/paths');
const VARIABLES = require('../../config/variables.config');
const spawn = require('cross-spawn');

const contribTypes = {
    LATEST: 'latest',
    NEXT: 'next',
    LOCAL: 'local',
};

const contribTypesValues = Object.keys(contribTypes).map(key => contribTypes[key]);

function getPlaykitPackages() {
    const appPackageJson = require(paths.appPackageJson);

    return  Object.keys(appPackageJson.dependencies)
        .reduce((playkitPackages, dependency) => {
            const [_, playkitPackage] = dependency.split(`${VARIABLES.CONTRIB}/`);

            return playkitPackage ? [...playkitPackages, playkitPackage] : playkitPackages;
        }, [])
        .map(packageName => `${VARIABLES.CONTRIB}/${packageName}`);
};

function installPackages(installStrategy, packages) {
    const child = spawn('npm', [installStrategy, ...packages], {
        stdio: 'inherit'
    });

    child.on('close', code => {
        if (code !== 0) {
            console.error(
                `Error while updating packages.`
            );
        }
    });
}

function chooseTagAndStrategy(type) {
    let installStrategy = 'install';
    let npmTag = null;


    switch (type) {
        case contribTypes.LATEST:
            npmTag = `@${contribTypes.LATEST}`;
            break;
        case contribTypes.NEXT:
            npmTag = `@${contribTypes.NEXT}`;
            break;
        case contribTypes.LOCAL:
            installStrategy = 'link';
            npmTag = '';
            break;
    }

    return {installStrategy, npmTag};
}

module.exports = {
    contribTypes,
    contribTypesValues,
    getPlaykitPackages,
    installPackages,
    chooseTagAndStrategy,
};
