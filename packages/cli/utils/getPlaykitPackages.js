const paths = require('../config/paths');
const VARIABLES = require('../config/variables.config');

module.exports = getPlaykitPackages = () => {
    const appPackageJson = require(paths.appPackageJson);

    return  Object.keys(appPackageJson.dependencies)
        .reduce((playkitPackages, dependency) => {
            const [_, playkitPackage] = dependency.split(`${VARIABLES.CONTRIB}/`);

            return playkitPackage ? [...playkitPackages, playkitPackage] : playkitPackages;
        }, [])
        .map(packageName => `${VARIABLES.CONTRIB}/${packageName}`);
};
