'use strict';

const validateProjectName = require('validate-npm-package-name');
const chalk = require('chalk');
const commander = require('commander');
const fs = require('fs-extra');
const path = require('path');
const execSync = require('child_process').execSync;
const spawn = require('cross-spawn');
const semver = require('semver');
const dns = require('dns');
const tmp = require('tmp');
const unpack = require('tar-pack').unpack;
const url = require('url');
const hyperquest = require('hyperquest');
const envinfo = require('envinfo');
const os = require('os');
const prompts = require("prompts");

const packageJson = require('./package.json');

function resolveHome(filepath) {
  if (filepath[0] === '~') {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

// These files should be allowed to remain on a failed install,
// but then silently removed during the next create.
const errorLogFilePatterns = [
    'npm-debug.log',
    'yarn-error.log',
    'yarn-debug.log',
];

let projectName;
let projectNpmName;
let projectGitRepo;
let projectDestination;

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments('<project-directory>')
    .usage(`${chalk.green('<project-directory>')} [options]`)
    .action(name => {
        projectName = name;
    })
    .option('--verbose', 'print additional logs')
    .option('--info', 'print environment debug info')
    .option(
        '--scripts-version <alternative-package>',
        'use a non-standard version of react-scripts'
    )
    .allowUnknownOption()
    .on('--help', () => {
        console.log(`    Only ${chalk.green('<project-directory>')} is required.`);
        console.log();
        console.log(
            `    A custom ${chalk.cyan('--scripts-version')} can be one of:`
        );
        console.log(`      - a specific npm version: ${chalk.green('0.8.2')}`);
        console.log(`      - a specific npm tag: ${chalk.green('@next')}`);
        console.log(
            `      - a custom fork published on npm: ${chalk.green(
                'my-playkit-js-contrib-scripts'
            )}`
        );
        console.log(
            `      - a local path relative to the current working directory: ${chalk.green(
                'file:../my-playkit-js-contrib-scripts'
            )}`
        );
        console.log(
            `      - a .tgz archive: ${chalk.green(
                'https://mysite.com/my-playkit-js-contrib-scripts-0.8.2.tgz'
            )}`
        );
        console.log(
            `      - a .tar.gz archive: ${chalk.green(
                'https://mysite.com/my-playkit-js-contrib-scripts-0.8.2.tar.gz'
            )}`
        );
        console.log(
            `    It is not needed unless you specifically want to use a fork.`
        );
        console.log();
        console.log();
    })
    .parse(process.argv);

if (program.info) {
    console.log(chalk.bold('\nEnvironment Info:'));
    return envinfo
        .run({
            System: ['OS', 'CPU'],
            Binaries: ['Node', 'npm', 'Yarn'],
            Browsers: ['Chrome', 'Edge', 'Internet Explorer', 'Firefox', 'Safari'],
            npmPackages: ['react', 'react-dom', 'react-scripts'],
            npmGlobalPackages: ['create-react-app'],
        }, {
            duplicates: true,
            showNotFound: true,
        })
        .then(console.log);
}

async function askProjectOptions() {
  const validation = (pattern = /^[a-z][a-z0-9-]*$/) => input => {
    if (!input) {
      return "This value should not be empty.";
    }

    if (!pattern.test(input)) {
      return 'The value is invalid. Use lower case characters, numbers or dash only.';
    }

    return true;
  };

  const onCancel = prompt => {
    console.log(`${chalk.red('Canceled!')}`);
    process.exit(1);
  };

  if (projectName) {
    projectDestination = path.resolve(projectName);
    projectName = path.basename(projectDestination);
  }

  const askName = {
    type: "text",
    name: "name",
    message: `Please specify the project name:`,
    validate: validation(),
    initial: projectName,
  };

  const askNpmName = name => ({
    type: "text",
    name: "npmName",
    message: "Please specify the plugin NPM name:",
    validate: validation(/^(@[a-z][a-z0-9-]+\/[a-z-][a-z0-9-]+|^[a-z-][a-z0-9-]+)$/),
    initial: `@playkit-js/${name}-plugin`,
    required: true,
  });

  const askGithubRepo = name => ({
    type: "text",
    name: "githubRepo",
    message: `Please specify the plugin GitHub repository:`,
    validate: validation(/^([a-z][a-z0-9-]+\/[a-z-][a-z0-9-]+|^[a-z][a-z0-9-]+)$/),
    initial: `kaltura/playkit-js-${name}`,
    required: true,
  });

  const askDestination = (name) => ({
    type: "text",
    name: "destination",
    message: `Please specify the destination folder where the plugin will be initialized:`,
    initial: projectDestination || `${process.cwd()}/playkit-js-${name}`,
    required: true,
  });

  const {
    name
  } = await prompts(askName, {onCancel});
  projectName = name;

  const {
    npmName
  } = await prompts(askNpmName(projectName), {onCancel});
  projectNpmName = npmName;

  const {
    githubRepo
  } = await prompts(askGithubRepo(projectName), {onCancel});
  projectGitRepo = githubRepo;

  const {
    destination
  } = await prompts(askDestination(projectName), {onCancel});
  projectDestination = path.resolve(resolveHome(destination.trim()));
}

function printValidationResults(results) {
    if (typeof results !== 'undefined') {
        results.forEach(error => {
            console.error(chalk.red(`  *  ${error}`));
        });
    }
}

(async () => {
    await askProjectOptions();

    const hiddenProgram = new commander.Command()
        .option(
            '--internal-testing-template <path-to-template>',
            '(internal usage only, DO NOT RELY ON THIS) ' +
            'use a non-standard application template'
        )
      .allowUnknownOption()
      .parse(process.argv);

    createApp(
        projectName,
        program.verbose,
        program.scriptsVersion,
        hiddenProgram.internalTestingTemplate
    );
})()

function createApp(
    name,
    verbose,
    version,
    template
) {
    const folderName = path.basename(projectDestination);

    checkAppName(folderName);
    fs.ensureDirSync(projectDestination);
    if (!isSafeToCreateProjectIn(projectDestination, folderName)) {
        process.exit(1);
    }

    console.log(`Creating a new contrib plugin for Kaltura player v7 in ${chalk.green(projectDestination)}.`);
    console.log();

    const packageJson = {
        name: projectNpmName,
        version: '0.0.1',
        private: false,
        bugs: {
            url: `https://github.com/${projectGitRepo}/issues`
        },
        homepage: `https://github.com/${projectGitRepo}#readme`,
        repository: {
            type: "git",
            url: `git+https://github.com/${projectGitRepo}.git`
        },
    };
    fs.writeFileSync(
        path.join(projectDestination, 'package.json'),
        JSON.stringify(packageJson, null, 2) + os.EOL
    );

    const originalDirectory = process.cwd();
    process.chdir(projectDestination);
    if (!checkThatNpmCanReadCwd()) {
        process.exit(1);
    }

    run(
        projectDestination,
        folderName,
        version,
        verbose,
        originalDirectory,
        template,
    );
}

function install(root, dependencies, verbose, isDevDependencies) {
    return new Promise((resolve, reject) => {
        let command;
        let args;

        command = 'npm';
        args = [
            'install',
            '--save',
            '--save-exact',
            '--loglevel',
            'error',
        ].concat(dependencies);



        if (verbose) {
            args.push('--verbose');
        }

        if (isDevDependencies) {
            const [_, save, ...other] = args;
            args = [_, '--save-dev', ...other];
        }

        const child = spawn(command, args, {
            stdio: 'inherit'
        });
        child.on('close', code => {
            if (code !== 0) {
                reject({
                    command: `${command} ${args.join(' ')}`,
                });
                return;
            }
            resolve();
        });
    });
}

function run(
    root,
    appName,
    version,
    verbose,
    originalDirectory,
    template,
) {
    const packageToInstall = getInstallPackage(version, originalDirectory);
    const allDependencies = [packageToInstall];
    allDependencies.push(
        '@playkit-js-contrib/common',
        "@playkit-js-contrib/plugin",
        "@playkit-js-contrib/ui",
        "classnames"
    );

    const devDependencies = [
        'preact@10.x',
        '@types/node',
        "@types/classnames",
        "@commitlint/cli@8.x",
        "@commitlint/config-conventional@8.x",
        "@typescript-eslint/eslint-plugin@2.x",
        "@typescript-eslint/parser@2.x",
        "husky@3.x",
        "tslint@5.x",
        "typescript@3.x"
    ];

    console.log('Installing packages. This might take a couple of minutes.');
    getPackageName(packageToInstall)
        .then(packageName => ({
            packageName: packageName
        }))
        .then(info => {
            const packageName = info.packageName;
            console.log(
                `Installing ${chalk.cyan(packageName)} cli library...`
            );
            console.log();

            return install(
                    root,
                    allDependencies,
                    verbose,
                )
                .then(() => install(
                    root,
                    devDependencies,
                    verbose,
                    true,
                ))
                .then(() => packageName);
        })
        .then(async packageName => {
            checkNodeVersion(packageName);
            setCaretRangeForRuntimeDeps(packageName);

            const pnpPath = path.resolve(process.cwd(), '.pnp.js');

            const nodeArgs = fs.existsSync(pnpPath) ? ['--require', pnpPath] : [];

            await executeNodeScript({
                    cwd: process.cwd(),
                    args: nodeArgs,
                },
                [root, projectName, verbose, originalDirectory, template],
                `
        var init = require('${packageName}/scripts/init.js');
        init.apply(null, JSON.parse(process.argv[1]));
      `
            );

            if (version === 'react-scripts@0.9.x') {
                console.log(
                    chalk.yellow(
                        `\nNote: the project was bootstrapped with an old unsupported version of tools.\n` +
                        `Please update to Node >=6 and npm >=3 to get supported tools in new projects.\n`
                    )
                );
            }
        })
        .catch(reason => {
            console.log();
            console.log('Aborting installation.');
            if (reason.command) {
                console.log(`  ${chalk.cyan(reason.command)} has failed.`);
            } else {
                console.log(chalk.red('Unexpected error. Please report it as a bug:'));
                console.log(reason);
            }
            console.log();

            // On 'exit' we will delete these files from target directory.
            const knownGeneratedFiles = ['package.json', 'yarn.lock', 'node_modules'];
            const currentFiles = fs.readdirSync(path.join(root));
            currentFiles.forEach(file => {
                knownGeneratedFiles.forEach(fileToMatch => {
                    // This removes all knownGeneratedFiles.
                    if (file === fileToMatch) {
                        console.log(`Deleting generated file... ${chalk.cyan(file)}`);
                        fs.removeSync(path.join(root, file));
                    }
                });
            });
            const remainingFiles = fs.readdirSync(path.join(root));
            if (!remainingFiles.length) {
                // Delete target folder if empty
                console.log(
                    `Deleting ${chalk.cyan(`${appName}/`)} from ${chalk.cyan(
                        path.resolve(root, '..')
                    )}`
                );
                process.chdir(path.resolve(root, '..'));
                fs.removeSync(path.join(root));
            }
            console.log('Done.');
            process.exit(1);
        });
}

function getInstallPackage(version, originalDirectory) {
    let packageToInstall = '@playkit-js-contrib/cli';
    const validSemver = semver.valid(version);
    if (validSemver) {
        packageToInstall += `@${validSemver}`;
    } else if (version) {
        if (version[0] === '@' && version.indexOf('/') === -1) {
            packageToInstall += version;
        } else if (version.match(/^file:/)) {
            packageToInstall = `file:${path.resolve(
                originalDirectory,
                version.match(/^file:(.*)?$/)[1]
            )}`;
        } else {
            // for tar.gz or alternative paths
            packageToInstall = version;
        }
    }

    return packageToInstall;
}

function getTemporaryDirectory() {
    return new Promise((resolve, reject) => {
        // Unsafe cleanup lets us recursively delete the directory if it contains
        // contents; by default it only allows removal if it's empty
        tmp.dir({
            unsafeCleanup: true
        }, (err, tmpdir, callback) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    tmpdir: tmpdir,
                    cleanup: () => {
                        try {
                            callback();
                        } catch (ignored) {
                            // Callback might throw and fail, since it's a temp directory the
                            // OS will clean it up eventually...
                        }
                    },
                });
            }
        });
    });
}

function extractStream(stream, dest) {
    return new Promise((resolve, reject) => {
        stream.pipe(
            unpack(dest, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(dest);
                }
            })
        );
    });
}

// Extract package name from tarball url or path.
function getPackageName(installPackage) {
    if (installPackage.match(/^.+\.(tgz|tar\.gz)$/)) {
        return getTemporaryDirectory()
            .then(obj => {
                let stream;
                if (/^http/.test(installPackage)) {
                    stream = hyperquest(installPackage);
                } else {
                    stream = fs.createReadStream(installPackage);
                }
                return extractStream(stream, obj.tmpdir).then(() => obj);
            })
            .then(obj => {
                const packageName = require(path.join(obj.tmpdir, 'package.json')).name;
                obj.cleanup();
                return packageName;
            })
            .catch(err => {
                // The package name could be with or without semver version, e.g. react-scripts-0.2.0-alpha.1.tgz
                // However, this function returns package name only without semver version.
                console.log(
                    `Could not extract the package name from the archive: ${err.message}`
                );
                const assumedProjectName = installPackage.match(
                    /^.+\/(.+?)(?:-\d+.+)?\.(tgz|tar\.gz)$/
                )[1];
                console.log(
                    `Based on the filename, assuming it is "${chalk.cyan(
                        assumedProjectName
                    )}"`
                );
                return Promise.resolve(assumedProjectName);
            });
    } else if (installPackage.indexOf('git+') === 0) {
        // Pull package name out of git urls e.g:
        // git+https://github.com/mycompany/react-scripts.git
        // git+ssh://github.com/mycompany/react-scripts.git#v1.2.3
        return Promise.resolve(installPackage.match(/([^/]+)\.git(#.*)?$/)[1]);
    } else if (installPackage.match(/.+@/)) {
        // Do not match @scope/ when stripping off @version or @tag
        return Promise.resolve(
            installPackage.charAt(0) + installPackage.substr(1).split('@')[0]
        );
    } else if (installPackage.match(/^file:/)) {
        const installPackagePath = installPackage.match(/^file:(.*)?$/)[1];
        const installPackageJson = require(path.join(
            installPackagePath,
            'package.json'
        ));
        return Promise.resolve(installPackageJson.name);
    }
    return Promise.resolve(installPackage);
}

function checkNpmVersion() {
    let hasMinNpm = false;
    let npmVersion = null;
    try {
        npmVersion = execSync('npm --version')
            .toString()
            .trim();
        hasMinNpm = semver.gte(npmVersion, '3.0.0');
    } catch (err) {
        // ignore
    }
    return {
        hasMinNpm: hasMinNpm,
        npmVersion: npmVersion,
    };
}

function checkYarnVersion() {
    let hasMinYarnPnp = false;
    let yarnVersion = null;
    try {
        yarnVersion = execSync('yarnpkg --version')
            .toString()
            .trim();
        let trimmedYarnVersion = /^(.+?)[-+].+$/.exec(yarnVersion);
        if (trimmedYarnVersion) {
            trimmedYarnVersion = trimmedYarnVersion.pop();
        }
        hasMinYarnPnp = semver.gte(trimmedYarnVersion || yarnVersion, '1.12.0');
    } catch (err) {
        // ignore
    }
    return {
        hasMinYarnPnp: hasMinYarnPnp,
        yarnVersion: yarnVersion,
    };
}

function checkNodeVersion(packageName) {
    const packageJsonPath = path.resolve(
        process.cwd(),
        'node_modules',
        packageName,
        'package.json'
    );

    if (!fs.existsSync(packageJsonPath)) {
        return;
    }

    const packageJson = require(packageJsonPath);
    if (!packageJson.engines || !packageJson.engines.node) {
        return;
    }

    if (!semver.satisfies(process.version, packageJson.engines.node)) {
        console.error(
            chalk.red(
                'You are running Node %s.\n' +
                'Create Playkit Plugin requires Node %s or higher. \n' +
                'Please update your version of Node.'
            ),
            process.version,
            packageJson.engines.node
        );
        process.exit(1);
    }
}

function checkAppName(appName) {
    const validationResult = validateProjectName(appName);
    if (!validationResult.validForNewPackages) {
        console.error(
            `Could not create a project called ${chalk.red(
                `"${appName}"`
            )} because of npm naming restrictions:`
        );
        printValidationResults(validationResult.errors);
        printValidationResults(validationResult.warnings);
        process.exit(1);
    }

    // TODO: there should be a single place that holds the dependencies
    // const dependencies = ['preact', 'react-dom', 'react-scripts'].sort();
    // if (dependencies.indexOf(appName) >= 0) {
    //     console.error(
    //         chalk.red(
    //             `We cannot create a project called ${chalk.green(
    //                 appName
    //             )} because a dependency with the same name exists.\n` +
    //             `Due to the way npm works, the following names are not allowed:\n\n`
    //         ) +
    //         chalk.cyan(dependencies.map(depName => `  ${depName}`).join('\n')) +
    //         chalk.red('\n\nPlease choose a different project name.')
    //     );
    //     process.exit(1);
    // }
}

function makeCaretRange(dependencies, name) {
    const version = dependencies[name];

    if (typeof version === 'undefined') {
        console.error(chalk.red(`Missing ${name} dependency in package.json`));
        process.exit(1);
    }

    let patchedVersion = `^${version}`;

    if (!semver.validRange(patchedVersion)) {
        console.error(
            `Unable to patch ${name} dependency version because version ${chalk.red(
                version
            )} will become invalid ${chalk.red(patchedVersion)}`
        );
        patchedVersion = version;
    }

    dependencies[name] = patchedVersion;
}

function setCaretRangeForRuntimeDeps(packageName) {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = require(packagePath);

    if (typeof packageJson.dependencies === 'undefined') {
        console.error(chalk.red('Missing dependencies in package.json'));
        process.exit(1);
    }

    const packageVersion = packageJson.dependencies[packageName];
    if (typeof packageVersion === 'undefined') {
        console.error(chalk.red(`Unable to find ${packageName} in package.json`));
        process.exit(1);
    }

    makeCaretRange(packageJson.devDependencies, 'preact');

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + os.EOL);
}

// If project only contains files generated by GH, it’s safe.
// Also, if project contains remnant error logs from a previous
// installation, lets remove them now.
// We also special case IJ-based products .idea because it integrates with CRA:
// https://github.com/facebook/create-react-app/pull/368#issuecomment-243446094
function isSafeToCreateProjectIn(root, name) {
    const validFiles = [
        '.DS_Store',
        'Thumbs.db',
        '.git',
        '.gitignore',
        '.idea',
        'README.md',
        'LICENSE',
        '.hg',
        '.hgignore',
        '.hgcheck',
        '.npmignore',
        'mkdocs.yml',
        'docs',
        '.travis.yml',
        '.gitlab-ci.yml',
        '.gitattributes',
    ];
    console.log();

    const conflicts = fs
        .readdirSync(root)
        .filter(file => !validFiles.includes(file))
        // IntelliJ IDEA creates module files before CRA is launched
        .filter(file => !/\.iml$/.test(file))
        // Don't treat log files from previous installation as conflicts
        .filter(
            file => !errorLogFilePatterns.some(pattern => file.indexOf(pattern) === 0)
        );

    if (conflicts.length > 0) {
        console.log(
            `The directory ${chalk.green(name)} contains files that could conflict:`
        );
        console.log();
        for (const file of conflicts) {
            console.log(`  ${file}`);
        }
        console.log();
        console.log(
            'Either try using a new directory name, or remove the files listed above.'
        );

        return false;
    }

    // Remove any remnant files from a previous installation
    const currentFiles = fs.readdirSync(path.join(root));
    currentFiles.forEach(file => {
        errorLogFilePatterns.forEach(errorLogFilePattern => {
            // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
            if (file.indexOf(errorLogFilePattern) === 0) {
                fs.removeSync(path.join(root, file));
            }
        });
    });
    return true;
}

function getProxy() {
    if (process.env.https_proxy) {
        return process.env.https_proxy;
    } else {
        try {
            // Trying to read https-proxy from .npmrc
            let httpsProxy = execSync('npm config get https-proxy')
                .toString()
                .trim();
            return httpsProxy !== 'null' ? httpsProxy : undefined;
        } catch (e) {
            return;
        }
    }
}

function checkThatNpmCanReadCwd() {
    const cwd = process.cwd();
    let childOutput = null;
    try {
        // Note: intentionally using spawn over exec since
        // the problem doesn't reproduce otherwise.
        // `npm config list` is the only reliable way I could find
        // to reproduce the wrong path. Just printing process.cwd()
        // in a Node process was not enough.
        childOutput = spawn.sync('npm', ['config', 'list']).output.join('');
    } catch (err) {
        // Something went wrong spawning node.
        // Not great, but it means we can't do this check.
        // We might fail later on, but let's continue.
        return true;
    }
    if (typeof childOutput !== 'string') {
        return true;
    }
    const lines = childOutput.split('\n');
    // `npm config list` output includes the following line:
    // "; cwd = C:\path\to\current\dir" (unquoted)
    // I couldn't find an easier way to get it.
    const prefix = '; cwd = ';
    const line = lines.find(line => line.indexOf(prefix) === 0);
    if (typeof line !== 'string') {
        // Fail gracefully. They could remove it.
        return true;
    }
    const npmCWD = line.substring(prefix.length);
    if (npmCWD === cwd) {
        return true;
    }
    console.error(
        chalk.red(
            `Could not start an npm process in the right directory.\n\n` +
            `The current directory is: ${chalk.bold(cwd)}\n` +
            `However, a newly started npm process runs in: ${chalk.bold(
                npmCWD
            )}\n\n` +
            `This is probably caused by a misconfigured system terminal shell.`
        )
    );
    if (process.platform === 'win32') {
        console.error(
            chalk.red(`On Windows, this can usually be fixed by running:\n\n`) +
            `  ${chalk.cyan(
                'reg'
            )} delete "HKCU\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n` +
            `  ${chalk.cyan(
                'reg'
            )} delete "HKLM\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n\n` +
            chalk.red(`Try to run the above two lines in the terminal.\n`) +
            chalk.red(
                `To learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/`
            )
        );
    }
    return false;
}


function executeNodeScript({
    cwd,
    args
}, data, source) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            [...args, '-e', source, '--', JSON.stringify(data)], {
                cwd,
                stdio: 'inherit'
            }
        );

        child.on('close', code => {
            if (code !== 0) {
                reject({
                    command: `node ${args.join(' ')}`,
                });
                return;
            }
            resolve();
        });
    });
}
