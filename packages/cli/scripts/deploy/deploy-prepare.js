const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const paths = require('../../config/paths');
const {spawnSync} = require('child_process');
const os = require("os");
const prompts = require('prompts');
const standardVersion = require('standard-version');

const extraArgs = process.argv.splice(4);

const packageJsonPath = paths.appPackageJson;
const binPath = path.resolve(paths.appNodeModules, '.bin');


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
    const tagName = `v${version}`;

    const isNext = version.indexOf('next') !== -1;

    console.log(chalk`
    {green Successfully created new plugin version}
     
    Version :${version}
  
    Before committing please test version.  
      
    To abort changes run:
    {bold git reset --hard}
    
    To commit changes to github run:
    {bold git commit -am "chore: publish version ${version}"}
    {bold git tag -a ${tagName} -m "${tagName}"}
    {bold git push --follow-tags}  
    
    Then, publish to npm:
    {bold npm run ${isNext ? 'deploy:next:publish-to-npm' : 'deploy:publish-to-npm'} -- --skip-rebuild}
  `);
}


async function promptWelcome() {
    console.log(chalk`{bgCyan {bold Welcome!}}
This script will prepare the next plugin version.
`);

    const onCancel = () => {
        console.log(`${chalk.red('Canceled!')}`);
        process.exit(1);
    };

    const answers = await prompts(
        [
            {
                name: 'contrib',
                type: 'confirm',
                message: 'Did you work with local version of contrib libraries?'
            },
            {
                name: 'contribLatest',
                type: prev => prev ? 'confirm' : null,
                message: 'Did you or someone else published those changes to npm?',
                initial: false
            }
        ],
        {onCancel}
    );

    if (answers.contrib) {
        if (!answers.contribLatest) {
            console.log(chalk.red('Cannot continue with the deployment. Please publish contrib first and try again'));
            return false;
        }

        console.log(chalk.blue(`update contrib dependencies to latest`));
        runSpawn('npm', ['run', 'contrib:latest']);

    }

    return true;
}

function getPluginVersion() {
    const playerPackageJson = fs.readJsonSync(packageJsonPath);
    return playerPackageJson['version'];
}

module.exports = async function run(options) {
    const { prerelease } = options;
    try {

        if (!await promptWelcome()) {
            return;
        }

        console.log(chalk.blue(`delete dist folder and node_modules`));
        runSpawn('npm', ['run', 'reset']);
        console.log(chalk.blue(`install dependencies`));
        runSpawn('npm', ['install']);
        console.log(chalk.blue(`build code and run open analyzer`));
        runSpawn('npm', ['run', 'analyze']);
        console.log(chalk.blue(`copy code and translates to qa-standalone folder`));
        runSpawn('npm', ['run', 'copy-resources']);
        console.log(chalk.blue(`run standard version`));

        await standardVersion({
              "skip": {
                  "tag": true,
                  "commit": true
              },
            prerelease: prerelease ? prerelease : undefined
          }
        );
        console.log(chalk.blue(`git stage all changes`));
        runSpawn('git', ['add', '*']);

        showSummary();
    } catch (err) {
        console.error(err);
    }
}
