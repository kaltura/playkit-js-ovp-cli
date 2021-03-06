'use strict';

const buildEnv = {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
};

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
    throw err;
});

const path = require('path');
const { appOverrideWebpack, appPath } = require('../config/paths');
const chalk = require('chalk');
const fs = require('fs-extra');
const webpack = require('webpack');
const configDev = require('../config/webpack.dev');
const configProd = require('../config/webpack.prod');
const commander = require('commander');
let config = null;


const program = new commander.Command('build')
    .option(
        '--dev',
        'the development build'
    )
    .parse(process.argv);

if (program.dev) {
    config = configDev;
    process.env.BABEL_ENV = buildEnv.DEVELOPMENT;
    process.env.NODE_ENV = buildEnv.DEVELOPMENT;
} else {
    config = configProd;
    process.env.BABEL_ENV = buildEnv.PRODUCTION;
    process.env.NODE_ENV = buildEnv.PRODUCTION;
}

if (fs.existsSync(appOverrideWebpack)) {
    const overrideWebpack = require(appOverrideWebpack);
    config = overrideWebpack(config);
    console.log(chalk.blue(`Using webpack config from ${path.relative(appPath, appOverrideWebpack)}.\n`));
}

build().then(({ stats, warnings }) => {
    if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(warnings.join('\n\n'));
        console.log(
            '\nSearch for the ' +
            chalk.underline(chalk.yellow('keywords')) +
            ' to learn more about each warning.'
        );
        console.log(
            'To ignore, add ' +
            chalk.cyan('// eslint-disable-next-line') +
            ' to the line before.\n'
        );
    } else {
        console.log(chalk.green('Compiled successfully.\n'));
    }
});

function build() {
    console.log(`Creating an optimized ${program.dev ? buildEnv.DEVELOPMENT : buildEnv.PRODUCTION} build...`);

    const compiler = webpack(config);
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            let messages;
            if (err) {
                if (!err.message) {
                    return reject(err);
                }
                messages = {
                    errors: [err.message],
                    warnings: [],
                };
            } else {
                messages = (
                    stats.toJson({ all: false, warnings: true, errors: true })
                );
            }
            if (messages.errors.length) {
                // Only keep the first error. Others are often indicative
                // of the same problem, but confuse the reader with noise.
                if (messages.errors.length > 1) {
                    messages.errors.length = 1;
                }
                return reject(new Error(messages.errors.join('\n\n')));
            }
            if (
                process.env.CI &&
                (typeof process.env.CI !== 'string' ||
                    process.env.CI.toLowerCase() !== 'false') &&
                messages.warnings.length
            ) {
                console.log(
                    chalk.yellow(
                        '\nTreating warnings as errors because process.env.CI = true.\n' +
                        'Most CI servers set it automatically.\n'
                    )
                );
                return reject(new Error(messages.warnings.join('\n\n')));
            }

            return resolve({
                stats,
                warnings: messages.warnings,
            });
        });
    });
}
