interface ITemplate {
    id: string;
    data: string;
}
interface IVar {
    id: string;
    value: string;
}
const templates: Array<ITemplate> =  [
    {
        id: 'MAIN_TYPESCRIPT_FILE',
        data: `
import { IAppAccessors, ILogger,} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';

export class __APPNAME__App extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }
}
`,
    },
    {
        id: 'README_FILE',
        data: `
# __APPNAME__
__APPDESCRIPTION__

## Getting Started
Now that you have generated a blank default Rocket.Chat App, what are you supposed to do next?
Start developing! Open up your favorite editor, our recommended one is Visual Studio code,
and start working on your App. Once you have something ready to test, you can either
package it up and manually deploy it to your test instance or you can use the CLI to do so.
Here are some commands to get started:
- \`rc-apps package\`: this command will generate a packaged app file (zip) which can be installed **if** it compiles with TypeScript
- \`rc-apps deploy\`: this will do what \`package\` does but will then ask you for your server url, username, and password to deploy it for you

## Documentation
Here are some links to examples and documentation:
- [Rocket.Chat Apps TypeScript Definitions Documentation](https://rocketchat.github.io/Rocket.Chat.Apps-engine/)
- [Rocket.Chat Apps TypeScript Definitions Repository](https://github.com/RocketChat/Rocket.Chat.Apps-engine)
- [Example Rocket.Chat Apps](https://github.com/graywolf336/RocketChatApps)
- Community Forums
  - [App Requests](https://forums.rocket.chat/c/rocket-chat-apps/requests)
  - [App Guides](https://forums.rocket.chat/c/rocket-chat-apps/guides)
  - [Top View of Both Categories](https://forums.rocket.chat/c/rocket-chat-apps)
  - [#rocketchat-apps on Open.Rocket.Chat](https://open.rocket.chat/channel/rocketchat-apps)
`,
    },
    {
        id: 'TS_CONFIG_FILE',
        data: `
{
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
`,
    },
    {
        id: 'TS_LINT_CONFIG_FILE',
        data: `
{
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
`,
    },
    {
        id: 'PACKAGEJSON_FILE',
        data: `
{
    "devDependencies": {
        "@rocket.chat/apps-engine": "^1.12.0",
        "@types/node": "^10.12.14",
        "tslint": "^5.10.0",
        "typescript": "^2.9.1"
        }
}
`,
    },
    {
        id: 'GITIGNORE_FILE',
        data: `
# ignore modules pulled in from npm
node_modules/

# rc-apps package output
dist/

# JetBrains IDEs
out/
.idea/
.idea_modules/

# macOS
.DS_Store
.AppleDouble
.LSOverride
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk
`,
    },
    {
        id: 'EDITOR_CONFIG_FILE',
        data: `
# EditorConfig is awesome: http://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
indent_style = space
indent_size = 4
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`,
    },
    {
        id: 'VSCODE_EXTS_FILE',
        data: `
{
    "recommendations": [
        "EditorConfig.editorconfig",
        "eamodio.gitlens",
        "eg2.vscode-npm-script",
        "wayou.vscode-todo-highlight",
        "minhthai.vscode-todo-parser",
        "ms-vscode.vscode-typescript-tslint-plugin",
        "rbbit.typescript-hero"
    ]
}
`,
    },
];
export function ConvertToCode(templateName: string, ...args: Array<IVar>): string {
    let { data }: ITemplate = templates.find((template: ITemplate) => template.id === templateName);
    args.forEach((element) => {
        data =  data.replace(element.id, element.value);
    });
    return data;
}
