// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.

process.on('unhandledRejection', err => {
    throw err;
});

const fs = require('fs-extra');
const {
    walk,
    ucfirst,
    snakeToCamel
} = require('../utils');
const format = require("string-template");
const compile = require("string-template/compile");
const path = require('path');
const paths = require('../config/paths');
const chalk = require('chalk');
const walkSync = require('walk-sync');
const execSync = require('child_process').execSync;
const spawn = require('cross-spawn');
const os = require('os');
const VARIABLES = require('../config/variables.config');

const defaultBrowsers = {
    production: ['>0.2%', 'not dead', 'not op_mini all'],
    development: [
        'last 1 chrome version',
        'last 1 firefox version',
        'last 1 safari version',
    ],
};

const pluginName = path.basename(paths.appPath);


function isInGitRepository() {
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            stdio: 'ignore'
        });
        return true;
    } catch (e) {
        return false;
    }
}

function tryGitInit(appPath) {
    let didInit = false;
    try {
        execSync('git --version', {
            stdio: 'ignore'
        });
        if (isInGitRepository()) {
            return false;
        }

        execSync('git init', {
            stdio: 'ignore'
        });
        didInit = true;

        execSync('git add -A', {
            stdio: 'ignore'
        });
        execSync('git commit -m "Initial commit"', {
            stdio: 'ignore',
        });
        return true;
    } catch (e) {
        if (didInit) {
            // If we successfully initialized but couldn't commit,
            // maybe the commit author config is not set.
            // In the future, we might supply our own committer
            // like Ember CLI does, but for now, let's just
            // remove the Git files to avoid a half-done state.
            try {
                // unlinkSync() doesn't work on directories.
                fs.removeSync(path.join(appPath, '.git'));
            } catch (removeErr) {
                // Ignore.
            }
        }
        return false;
    }
}

module.exports = function (
    appPath,
    appName,
    verbose,
    originalDirectory,
    template
) {
    const ownPath = path.dirname(
        require.resolve(path.join(__dirname, '..', 'package.json'))
    );
    const appPackage = require(path.join(appPath, 'package.json'));

    // Copy over some of the devDependencies
    appPackage.dependencies = appPackage.dependencies || {};
    appPackage.license = "AGPL-3.0";
    appPackage.files = [
        "dist",
        "LICENSE",
        "README.md",
        "CHANGELOG.md",
        "src"
    ];

    // Setup the script rules
    appPackage.scripts = {
        "clean": "rm -rf dist",
        "reset": "npm run clean && rm -rf node_modules",
        "build": "kcontrib build",
        "build:dev": "kcontrib build --dev",
        "serve": "kcontrib serve",
        "serve:update-modes": "kcontrib serve --update-modes",
        "serve:update-player": "kcontrib serve --update-player",
        "analyze": `npm run build && npx source-map-explorer dist/${appName}.js`,
        "lint": "tsc --noEmit && eslint ./src --ext .ts,.tsx",
        "lint:fix": "tsc --noEmit && eslint ./src --ext .ts,.tsx --fix",
        "husky:pre-commit": "lint-staged",
        "husky:commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
        "deploy:prepare": "kcontrib deploy --prepare",
        "deploy:publish-to-npm": "kcontrib deploy --publish",
        "deploy:next:prepare": "kcontrib deploy --prepare --prerelease next",

        "infra:latest": 'kcontrib infra --type=latest',
        "infra:next": 'kcontrib infra --type=next',
        "infra:local": 'kcontrib infra --type=local',
        "infra:add": "kcontrib infra --add"
    };

    // Setup the browsers list
    appPackage.browserslist = defaultBrowsers;

    fs.writeFileSync(
        path.join(appPath, 'package.json'),
        JSON.stringify(appPackage, null, 2) + os.EOL
    );

    const readmeExists = fs.existsSync(path.join(appPath, 'README.md'));
    if (readmeExists) {
        fs.renameSync(
            path.join(appPath, 'README.md'),
            path.join(appPath, 'README.old.md')
        );
    }

    // Copy the files for the user
    const templatePath = template ?
        path.resolve(originalDirectory, template) :
        path.join(ownPath, 'template');
    if (fs.existsSync(templatePath)) {
        fs.copySync(templatePath, appPath);
    } else {
        console.error(
            `Could not locate supplied template: ${chalk.green(templatePath)}`
        );
        return;
    }

    fs.writeFileSync(
        paths.appInitialConfig,
        JSON.stringify({pluginName: appName}, null, 2) + os.EOL
    );

    // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
    // See: https://github.com/npm/npm/issues/1862
    try {
        fs.moveSync(
            path.join(appPath, 'gitignore'),
            path.join(appPath, '.gitignore'),
            []
        );
    } catch (err) {
        // Append if there's already a `.gitignore` file there
        if (err.code === 'EEXIST') {
            const data = fs.readFileSync(path.join(appPath, 'gitignore'));
            fs.appendFileSync(path.join(appPath, '.gitignore'), data);
            fs.unlinkSync(path.join(appPath, 'gitignore'));
        } else {
            throw err;
        }
    }

    let command;
    let args;
    command = 'npm';
    args = ['install', '--save', verbose && '--verbose'].filter(e => e);

    args.push('preact');

    // Install additional template dependencies, if present
    const templateDependenciesPath = path.join(
        appPath,
        '.template.dependencies.json'
    );
    if (fs.existsSync(templateDependenciesPath)) {
        const templateDependencies = require(templateDependenciesPath).dependencies;
        args = args.concat(
            Object.keys(templateDependencies).map(key => {
                return `${key}@${templateDependencies[key]}`;
            })
        );
        fs.unlinkSync(templateDependenciesPath);
    }

    // install local kaltura client
    console.log(`Installing local Kaltura client library using ${command}...`);
    console.log();
    const proc = spawn.sync(command,
      ['install', '--save', verbose && '--verbose',
      `file:libs/kaltura-typescript-client-7.0.0-v20190324-101134.tgz`], {
        stdio: 'inherit'
    });
    if (proc.status !== 0) {
        console.error(`failed to install local Kaltura client library`);
        return;
    }

    replaceTemplate(appPath, appName);

    // installSubPackages(appPath);

    if (tryGitInit(appPath)) {
        console.log();
        console.log('Initialized a git repository.');
    }
    const cdpath = appPath;

    // Change displayed command to yarn instead of yarnpkg
    const displayedCommand = 'npm';

    console.log();
    console.log(`Success! Created ${appName} at ${appPath}`);
    console.log('Inside that directory, you can run several commands:');
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} start`));
    console.log('    Starts the development server.');
    console.log();
    console.log(
        chalk.cyan(`  ${displayedCommand} run build`)
    );
    console.log('    Bundles the app into static files for production.');
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} test`));
    console.log('    Starts the test runner.');
    console.log();
    console.log(
        chalk.cyan(`  ${displayedCommand} run eject`)
    );
    console.log(
        '    Removes this tool and copies build dependencies, configuration files'
    );
    console.log(
        '    and scripts into the app directory. If you do this, you can’t go back!'
    );
    console.log();
    console.log('We suggest that you begin by typing:');
    console.log();
    console.log(chalk.cyan('  cd'), cdpath);
    console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
    if (readmeExists) {
        console.log();
        console.log(
            chalk.yellow(
                'You had a `README.md` file, we renamed it to `README.old.md`'
            )
        );
    }
    console.log();
    console.log('Happy hacking!');
};

function replaceTemplate(appPath, appName) {
    walkSync(appPath, {
            ignore: ['node_modules', '.git']
        })
        .filter(file => !path.extname(file).match(/\.(tgz|tar)/))
        .filter(file => fs.statSync(file).isFile())
        .forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const filename = path.basename(file);
            const hasTemplateInContent = content ? VARIABLES.TEMPLATE.test(content) || VARIABLES.DATE_TEMPLATE.test(content) : false;
            const hasTemplateInFilename = VARIABLES.TEMPLATE.test(filename);
            const camelCase = snakeToCamel(appName);
            const upperCaseAppName = ucfirst(camelCase);
            const replace = str => str
                .replace(VARIABLES.DATE_TEMPLATE, new Date().toDateString())
                .replace(VARIABLES.TEMPLATE_FOR_REPLACE_LOWERCASE, appName)
                .replace(VARIABLES.TEMPLATE_FOR_REPLACE_CAPITALCASE, upperCaseAppName);

            if (hasTemplateInContent) {
                const result = replace(content);
                fs.writeFileSync(file, result, 'utf8');
            }

            if (hasTemplateInFilename) {
                const pathToFile = path.dirname(file);
                fs.renameSync(file, `${pathToFile}/${replace(filename)}`);
            }
        });
}

function installSubPackages(appPath, verbose) {

    const originalDirectory = process.cwd();
    const packageDirectory = path.join(appPath, 'packages');
    const packages = fs.readdirSync(packageDirectory).map(file => ({
            folder: path.join(packageDirectory, file),
            name: file
        }))
        .filter(({
            folder
        }) => !fs.statSync(folder).isFile())
        .filter(({
            folder
        }) => fs.existsSync(path.join(folder, 'package.json')));
    packages.forEach(({
        folder,
        name
    }) => {
        process.chdir(folder);
        let command;
        let args;
        command = 'npm';
        console.log();
        console.log(`Installing ${chalk.cyan(name)} dependencies, this may take couple of minutes`);
        args = ['install', verbose && '--verbose'].filter(e => e);
        const proc = spawn.sync(command, args, {
            stdio: 'inherit'
        });
        if (proc.status !== 0) {
            console.log();
            console.error(`\`${command} ${args.join(' ')}\` failed`);
        }
        console.log();
        console.log(`Finished installing ${chalk.cyan(name)} dependencies`);
    });
    process.chdir(originalDirectory);
}

