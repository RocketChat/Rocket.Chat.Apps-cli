# temporary-rocketlets-dev-environment
Development environment for getting started developing Rocketlets.

## Getting Started
Extremely simple.

```
git clone git@github.com:graywolf336/temporary-rocketlets-dev-environment.git
npm install
npm start
```

This will watch the `rocketlets` directory for changes and run everything.

## Environment Layout Explained
In trying to make this a smooth development environment there were a few decisions made.
First up, unless you're extending the development environment, the only folder you should be concerned about is `rocketlets` and `dist`.
The other folders are for making the development environment a pleasure to work with (hopefully).
The `.server` directory is the "mock" server with storage, this is where the code lives which mocks up the Rocket.Chat server.
