export const tsLintConfigTemplate = (): string => {
return `{
    "extends": "tslint:recommended",
    "rules": {
      "array-type": [true, "generic"],
      "member-access": true,
      "no-console": [false],
      "no-duplicate-variable": true,
      "object-literal-sort-keys": false,
      "quotemark": [true, "single"],
      "max-line-length": [true, {
          "limit": 160,
          "ignore-pattern": "^import | *export .*? {"
      }]
    }
}
`;
};
