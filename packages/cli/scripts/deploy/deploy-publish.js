const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const paths = require('../../config/paths');
const {spawnSync, execSync} = require('child_process');
const os = require("os");
const prompts = require('prompts');

const extraArgs = process.argv.splice(2);
let skipRebuild = false;

(() => {
    const skipRebuildIndex = extraArgs.indexOf('--skip-rebuild');

    if (skipRebuildIndex !== -1) {
        skipRebuild = true;
        extraArgs.splice(skipRebuildIndex, 1);
    }
})();

const packageJsonPath = paths.appPackageJson;

function runSpawn(command, args, extra = {}) {
    const stdio = typeof extra.stdio === 'string' ? [extra.stdio, extra.stdio, 'pipe'] :
        Array.isArray(extra.stdio) && extra.stdio.length === 3 ? [extra.stdio[0], extra.stdio[1], 'pipe'] : 'inherit' // 'pipe'
    const result = spawnSync(command, args, {...extra, stdio});

    if (result.status === null || result.status !== 0) {
        throw new Error(result.stderr || 'general error');
    }

    return result;
}

function showSummary() {
    const version = getPluginVersion();

    console.log(chalk`
    {green Successfully published plugin to npm}
     
    Version :${version}
  `);
}


async function promptWelcome() {
    const version = getPluginVersion();
    const isNext = version.indexOf('next') !== -1;

    console.log(chalk`{bgCyan {bold Welcome!}}
This script will publish version {bold ${version}} to npm.
`);

    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const answers = await prompts(
        [
            {
                name: 'confirmVersion',
                type: 'confirm',
                initial: true,
                message: `Are you trying to publish version ${version}?`
            },
            {
                name: 'tag',
                type: prev => prev ? 'select' : null,
                choices: ['Latest', 'Next'],
                message: `What is the type of version you want to publish?`,
            },
            {
                name: 'skipRebuild',
                type: _ => skipRebuild ? 'confirm' : null,
                message: `Are you sure you want to skip rebuild (accept only if you just ran the prepare locally)?`,
                initial: true,
            },
        ],
        {onCancel}
    );

    if (!answers.confirmVersion) {
        console.log(chalk.red(`Operation cancelled by user.`));
        return false;
    }

    if (skipRebuild && !answers.skipRebuild) {
        console.log(chalk.red(`Cannot continue with the publish. argument 'skipRebuild' was falsy provided.`));
        return false;
    }

    if (answers.tag === 'Latest' && isNext) {
        console.log(chalk.red(`Cannot continue with the publish. Current version is tagged as 'next'.`));
        return false;
    }

    if (answers.tag === 'Next' && !isNext) {
        console.log(chalk.red(`Cannot continue with the publish. Current version is tagged as 'latest'.`));
        return false;
    }

    return true;
}

function getPluginVersion() {
    const playerPackageJson = fs.readJsonSync(packageJsonPath);
    return playerPackageJson['version'];
}

(async function () {
    try {
        const version = getPluginVersion();
        const result = execSync('git tag --sort=taggerdate | tail -1').toString();

        const currentTag = result.match('^v(.*)').pop();
        if (version !== currentTag) {
            return console.log(chalk.red(`Cannot publish. Current tag version is not matching package.json version (expected ${version} got ${currentTag}).`));
        }

        if (!await promptWelcome()) {
            return;
        }

        if (!skipRebuild) {
            console.log(chalk.blue(`delete dist folder and node_modules`));
            runSpawn('npm', ['run', 'reset']);
            console.log(chalk.blue(`install dependencies`));
            runSpawn('npm', ['install']);
            console.log(chalk.blue(`build code`));
            runSpawn('npm', ['run', 'build']);
        }
        console.log(chalk.blue(`publish to npm`));
        runSpawn('npm', ['publish', '--access', 'public']);

        showSummary();
    } catch (err) {
        console.error(err);
    }
})();


