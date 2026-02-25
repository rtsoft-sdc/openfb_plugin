# OpenFB Plugin для VS Code

OpenFB Plugin добавляет в VS Code интерактивный редактор диаграмм IEC 61499 Function Block (FBD) для файлов `.sys`.

## Что умеет

- Открывает и визуализирует `.sys` как интерактивную диаграмму
- Поддерживает pan/zoom, выделение и drag-and-drop блоков
- Создаёт связи между портами (event/data) с валидацией совместимости
- Удаляет блоки и связи (`Delete` и контекстное меню)
- Редактирует параметры блоков и OPC mapping
- Сохраняет изменения обратно в `.sys`
- Генерирует `.fboot` и выполняет deploy в OpenFB runtime
- Показывает логи в webview и extension output

## Быстрый старт

1. Установите расширение в VS Code.
2. В Explorer нажмите правой кнопкой на `.sys` файле.
3. Выберите команду **OpenFB: Открыть диаграмму проекта**.


## Настройки

- `openfb.fbLibraryPaths` — пути поиска библиотек `.fbt`
- `openfb.host` — адрес OpenFB runtime
- `openfb.port` — порт OpenFB runtime
- `openfb.deployTimeoutMs` — таймаут deploy в миллисекундах

## Требования

- VS Code 1.85.0+

