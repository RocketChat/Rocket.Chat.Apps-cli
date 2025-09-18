export const packageJsonTemplate = (): string => {
  return `{
    "devDependencies": {
        "@rocket.chat/apps-engine": "^1.55.0",
        "@types/node": "^22.0.0",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "@typescript-eslint/parser": "^8.0.0",
        "eslint": "^9.0.0",
        "typescript": "^5.6.2"
    },
    "dependencies": {
      	"@rocket.chat/icons": "^0.40.0",
        "@rocket.chat/ui-kit": "^0.40.0"
    }
}`
}
