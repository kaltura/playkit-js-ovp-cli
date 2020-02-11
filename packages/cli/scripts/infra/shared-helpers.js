const paths = require('../../config/paths');
const VARIABLES = require('../../config/variables.config');
const spawn = require('cross-spawn');

const contribTypes = {
    LATEST: 'latest',
    NEXT: 'next',
    LOCAL: 'local',
};

const contribTypesValues = Object.keys(contribTypes).map(key => contribTypes[key]);

function getPlaykitPackages(ignoreList = []) {
    ignoreList.push(...VARIABLES.CONTRIB_IGNORED_PACKAGES);
    const appPackageJson = require(paths.appPackageJson);
    const getFromPackageJson = (dependencyType = 'dependencies') => {
        return Object.keys(appPackageJson[dependencyType])
            .reduce((playkitPackages, dependency) => {
                const [_, playkitPackage] = dependency.split(`${VARIABLES.CONTRIB}/`);

                return playkitPackage ? [...playkitPackages, playkitPackage] : playkitPackages;
            }, [])
            .filter(packageName => !ignoreList.includes(packageName))
            .map(packageName => `${VARIABLES.CONTRIB}/${packageName}`);
    };

    return []
        .concat(getFromPackageJson())
        .concat(getFromPackageJson("devDependencies"));
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
