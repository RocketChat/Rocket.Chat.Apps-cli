export const packageJsonTemplate = (): string => {
    return `{
    "devDependencies": {
        "@rocket.chat/apps-engine": "^1.44.0",
        "@types/node": "14.14.6",
        "tslint": "^5.10.0",
        "typescript": "^5.6.2"
    },
    "dependencies": {
      	"@rocket.chat/icons": "^0.38.0",
        "@rocket.chat/ui-kit": "^0.36.1"
    }
}`;
};
