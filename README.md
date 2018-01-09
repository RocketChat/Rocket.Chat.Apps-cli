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

## Environment Layout Explained
In trying to make this a smooth development environment there were a few decisions made.
First up, unless you're extending the development environment, the only folder you should be concerned about is `apps` and `dist`.
The other folders are for making the development environment a pleasure to work with (hopefully).
The `.server` directory is the "mock" server with storage, this is where the code lives which mocks up the Rocket.Chat server.

## Generating an App ID
We require UUID Version 4 for IDs. To generate one for your App we recommend this site: https://www.uuidgenerator.net/version4

## Logging Inside a App
Due to limitations of NodeJS's `vm` package we have had to implement a custom logger class.
To make usage of this you can use `this.getLogger()` and then do the normal `console` style logging.
