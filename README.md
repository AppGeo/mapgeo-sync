# mapgeo-sync

Rewrite of https://bitbucket.org/AppGeo/appgeo_mapgeo2.uploader as an Electron app that runs in the background and is self-updating.

- self updating so we can deploy changes and not have to log into every client's machine.
- scheduling will be built in (no windows scheduler)
- support postgres as well
- user gets a UI to debug issues
- fix keep-alive at the same time
- move away from technical debt which no one knew or maintained (.net uploader)
- allow for future enhancements
- move away from deprecated optouts api

This uses MapGeo APIs and is built for MapGeo specifically. It is public because it runs on user's machines and
we want to have transparency into what we run.

## Folder Structure

The root folder is a default Ember app generated with `ember new`.
The project uses an addon called `ember-electron` that facilitates the interaction between Electron and Ember using Electron Forge.

```sh
-/ # Ember App
 |_ package.json # Ember Deps & Electron config
   |_ app/ # Ember UI code lives here
 |_ electron-app/ # Electron Forge setup
   |_ package.json # Electron deps
   |_ src/ # Electron Code
     |_ index.ts # Code entry point
```

## How It Works

This app takes data from the local machine it runs on and transforms that data and pushes it to S3, where MapGeo can get at it. It then notifies MapGeo that the data is there and how to handle that data and where it should go. Then it waits for a upload-status.json in that same folder in S3 for the results of that upload. Once the file is there it shows the results in Sync.

The actual work of getting the data into Studio (carto) is on the MapGeo side, under the uploader route.

## Running Locally

When running MapGeo with HTTPS locally, you need to copy the `caPath` when you start MapGeo.
Then start the electron app (`cd electron-app/`) with something like this, remember to replace the cert path:`

```sh
NODE_EXTRA_CA_CERTS="/Users/iradchenko/Library/Application Support/devcert/certificate-authority/certificate.cert" yarn debug
# Can also run yarn watch:debug
```

When the client app (Ember app) rebuilds (using `yarn watch`) you need to close the main UI window, and in the taskbar (top right on mac, bottom right on windows) click the logo and click "Preferences" to reload that UI.

### Config

The app uses electron-store to save a configuration of the rules, sources, and mapgeo settings, and any cached data. This file path is printed when you start the electron app (`yarn watch` or `yarn watch:debug` in `./electron-app`).

You can also get to this file easily using the Debugging menu (top left on mac, or in taskbar on both) and "Open Config".

If you get into a situation where there is an error, you can delete this file to reset everything.

### Testing

Generally test against https://tester.alpha.mapgeo.io or https://appgeo.mapgeo.io

#### Generating File Formats

To create a File GeoDatabase, you can use GeoJSON to create it using this command:

```sh
ogr2ogr -f "FileGDB" output.gdb input.geojson
```

## Electron

> Note: these instructions don't work, see the publish section further down. Probably want to setup a Github Action to auto publish instead of opening Workspaces every time.

On mac you need to install Wine and mono, `brew install wine-stable && brew install mono` to build for Windows.

Building the app: `cd electron-app/` first.

```sh
yarn package
yarn package:win
```

### Logs

Are located here:

- on Linux: `~/.config/MapGeo Sync/logs/main.log`
- on macOS: `~/Library/Logs/MapGeo Sync/main.log`
- on Windows: `%USERPROFILE%\AppData\Roaming\MapGeo Sync\logs\main.log`

### Publish

To publish to Github releases, you must first get a Github Token.

```sh
# Build Client Code
yarn build:dev

# Build Electron Code
cd ./electron-app
# Update version in package.json
yarn build:ts

# Publish
# MacOS
GITHUB_TOKEN=<token> yarn publish:macos
# Windows, running this on macos should work, but currently doesn't due to a bug in the squirrel maker
GITHUB_TOKEN=<token> yarn publish:windows
```

Releases can be seen here: https://github.com/AppGeo/mapgeo-sync/releases

## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- [Ember CLI](https://ember-cli.com/)
- [Google Chrome](https://google.com/chrome/)

## Installation

- `git clone <repository-url>` this repository
- `cd mapgeo-sync`
- `yarn install`

## Running / Development

- `ember serve`
- Visit your app at [http://localhost:4200](http://localhost:4200).
- Visit your tests at [http://localhost:4200/tests](http://localhost:4200/tests).

### Code Generators

Make use of the many generators for code, try `ember help generate` for more details

### Running Tests

- `ember test`
- `ember test --server`

### Linting

- `yarn lint`
- `yarn lint:fix`

### Building

- `ember build` (development)
- `ember build --environment production` (production)

### Deploying

Specify what it takes to deploy your app.

## Further Reading / Useful Links

- [ember.js](https://emberjs.com/)
- [ember-cli](https://ember-cli.com/)
- Development Browser Extensions
  - [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  - [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
