module.exports = snakeToCamel = (str) => str.replace(
    /([-][a-z])/g,
    (group) => group.toUpperCase()
        .replace('-', '')
);
