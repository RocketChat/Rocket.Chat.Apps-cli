# Rocket.Chat Apps Development Environment
Development environment for getting started developing Rocket.Chat Apps.

## Getting Started
Extremely simple.

```
git clone git@github.com:RocketChat/Rocket.Chat.Apps-dev-environment.git
npm install
npm start
```

This will watch the `apps` directory for changes and run everything.

### Environment Layout Explained
In trying to make this a smooth development environment there were a few decisions made.
First up, unless you're extending the development environment, the only folder you should be concerned about is `apps` and `dist`.

### Generating an App ID
We require UUID Version 4 for IDs. To generate one for your App we recommend this site: https://www.uuidgenerator.net/version4

### Logging Inside an App
Due to limitations of NodeJS's `vm` package we have had to implement a custom logger class.
To make usage of this you can use `this.getLogger()` and then do the normal `console` style logging.

## Rocket.Chat App Development

The minimum necessary to create a Rocket.Chat App is having an `app.json` file and a `.ts` class which extends the `App` class and an icon.

### npm run create-app

The development tools provide a command to quickly scaffold a new Rocket.Chat App, simply run `npm run create-app "<App Name>"` and a new folder will be created inside the `apps` folder with an `app.json` file containing the basic information of your app (please remember to update the UUID), a dummy `icon.jpg` image and the initial implementation of the App on `index.ts`.

### App description

The app description file, named `app.json`, contains basic information about the app. You can check the `app-schema.json` file for all the detailed information and fields allowed in the app description file, the basic structure is similar to this:

```
{
    "id": "5cb9a329-0613-4d39-b20f-cc2cc9175df5",
    "name": "App Name",
    "nameSlug": "app-name",
    "version": "0.0.1",
    "requiredApiVersion": "^0.9.13",
    "description": "App which provides something very useful for Rocket.Chat users.",
    "author": {
        "name": "Author Name <author@email.com>",
        "support": "Support Url or Email"
    },
    "classFile": "main.ts",
    "iconFile": "beautiful-app-icon.jpg"
}
```

### Extending the App class

The basic creation of an App is based on extending the `App` class from the Rocket.Chat Apps _ts-definition_ library. Your class also has to implement the constructor and optionally the `initialize` function, for more details on those check the (App definition documentation)[https://rocketchat.github.io/Rocket.Chat.Apps-ts-definition/classes/app.html]

```
import {
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    ILogger,
} from '@rocket.chat/apps-ts-definition/accessors';
import { App } from '@rocket.chat/apps-ts-definition/App';
import { IAppInfo } from '@rocket.chat/apps-ts-definition/metadata';

export class TodoListApp extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    public async initialize(configurationExtend: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await this.extendConfiguration(configurationExtend, environmentRead);
        this.getLogger().log('Hello world from my app');
    }
}
```

### Packaging the app

Currently the Rocket.Chat servers and Marketplace allow submission of zip files, these files can be created by running `npm run package` which packages your app and creates the zip file under `dist` folder.
