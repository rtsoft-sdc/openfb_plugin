# OpenFB Plugin for VS Code

OpenFB Plugin provides an interactive editor for IEC 61499 Function Block Diagram (FBD) to VS Code for 4diac and ForgeLogic projects (`.sys` files). It enables deployment to the OpenFB runtime environment.

## Features

- Opens and visualizes IEC 61499 projects from `.sys` files as interactive diagrams
- Supports pan/zoom, selection, and block drag-and-drop
- Creates connections between ports (event/data) with compatibility validation
- Deletes blocks and connections (`Delete` key and context menu)
- Allows editing block parameters and OPC UA mappings (marks inputs and outputs as publishable via an OPC UA server using a ForgeLogic-compatible format)
- Saves project changes back to `.sys`
- Generates `.fboot` and deploys to the OpenFB runtime
- Shows logs in both the webview and extension output
- During deployment, prompts to create a `.fboot` file if one is missing
- When generating `.fboot`, asks for confirmation before overwriting existing files
- Automatically refreshes the `Block Library` panel:
  - after creating a new FB type
  - after saving library path settings
- Supports panel UI localization (`ru`/`en`) via the `openfb.uiLanguage` setting
- After changing language in settings, button labels, tab labels, and canvas text are refreshed immediately in the open panel
- The current version supports only one compute node in the hardware configuration

## Quick Start

1. Install the extension in VS Code.
2. In Explorer, right-click a `.sys` file.
3. Select **OpenFB: Open project diagram**.

## Settings

- `openfb.fbLibraryPaths` - search paths for `.fbt` libraries
- `openfb.host` - OpenFB runtime host
- `openfb.port` - OpenFB runtime port
- `openfb.deployTimeoutMs` - deployment timeout in milliseconds
- `openfb.uiLanguage` - OpenFB panel UI language (`en` by default)

## Localization

- `package.json` localization (Explorer context menu command title and settings descriptions) is defined via `package.nls.json` and `package.nls.ru.json`.
- These strings depend on VS Code Display Language, not on `openfb.uiLanguage`.
- `openfb.uiLanguage` controls only the OpenFB webview panel language and is applied immediately after saving settings.

## Recent Changes

- Updated `.fboot` generation/deployment dialogs with action confirmations.
- Generation and deployment messages now show file names without full paths.
- Fixed class name display for newly added library blocks.
- Improved handling of `Type Library` paths for multiple `.sys` projects.
- Added `package.json` localization via `package.nls*.json`.
- Changed default OpenFB panel language to English (`en`).
- Added immediate refresh of static panel labels and empty-canvas text after language change in settings.

## Requirements

- VS Code 1.85.0+
