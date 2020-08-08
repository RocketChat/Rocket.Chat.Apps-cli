export const tsConfigTemplate = (): string => {
    return `{
"compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": false,
    "noImplicitAny": false,
    "removeComments": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    },
"include": [
    "**/*.ts"
    ]
}
`;
};
