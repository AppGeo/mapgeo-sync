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

If you want to update the main table of a single table setup, the action must set `FormatAsGeoJson` to `true`, this way the geometry is inserted.

## Running

When running MapGeo with HTTPS locally, you need to copy the `caPath` when you start MapGeo.
Then start the electron app (`cd electron-app/`) with something like this, remember to replace the cert path:`

```sh
NODE_EXTRA_CA_CERTS="/Users/iradchenko/Library/Application Support/devcert/certificate-authority/certificate.cert" yarn debug
```

### Testing File Formats

To create a File GeoDatabase, you can use GeoJSON to create it using this command:

```sh
ogr2ogr -f "FileGDB" output.gdb input.geojson
```

## Changed Config

- `UploadActions` now requires a `DbType` filed, valid values include 'pg'
- `UploadActions` can now specify a `DatasetId` (defaults to 'properties' if not specified)
- `UploadActions` requires a `GeometryColumn` if `FormatAsGeoJson` is set to true.

## Electron

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
# MacOS
GITHUB_TOKEN=<token> yarn publish:macos
# Windows, running this macos should work, but currently doesn't due to a bug in the squirrel maker
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
