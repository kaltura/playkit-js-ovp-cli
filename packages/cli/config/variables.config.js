const DATE_TEMPLATE = /__today_date__/ig;
const TEMPLATE = /__plugin_name__/i;
const TEMPLATE_FOR_REPLACE_LOWERCASE = /__plugin_name__/g;
const TEMPLATE_FOR_REPLACE_CAPITALCASE = /__Plugin_Name__/g;
const CONTRIB = '@playkit-js-contrib';
const REPO = 'https://github.com/kaltura/playkit-js-contrib.git';
const TAG_PATTERN = 'kaltura-ovp-player@';
const CLI_PLUGIN_NAME = 'create-contrib-plugin';

const modes = {
    userType: ['annonymous', 'widgetId', 'ks'],
    bundler: ['custom', 'uiconf'],
    serverEnv: ['qa', 'production'],
    bundlerEnv: ['qa', 'production'],
};

const modesTypes = Object.keys(modes);

module.exports = {
    DATE_TEMPLATE,
    TEMPLATE,
    TEMPLATE_FOR_REPLACE_LOWERCASE,
    TEMPLATE_FOR_REPLACE_CAPITALCASE,
    CONTRIB,
    REPO,
    TAG_PATTERN,
    modes,
    modesTypes,
    CLI_PLUGIN_NAME,
};
