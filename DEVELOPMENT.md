# Development

## Запуск из исходников

```bash
git clone <repository-url>
cd openFbPlugin
npm install
npm run compile
```

Запуск в режиме разработки:

1. Откройте проект в VS Code.
2. Нажмите `F5` (Run → Start Debugging).
3. Расширение запустится в Extension Development Host.

## Сборка VSIX

```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
```

В корне проекта будет создан файл вида `openfb-plugin-<version>.vsix`.

