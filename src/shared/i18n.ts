import type { UiLanguage } from "./pluginSettings";

type I18nParamValue = string | number | boolean | null | undefined;
export type I18nParams = Record<string, I18nParamValue>;

type TranslationEntry = Readonly<Record<UiLanguage, string>>;
type ResourceTree = {
  readonly [key: string]: TranslationEntry | ResourceTree;
};


const resources = {
  common: {
    ok: { en: "OK", ru: "ОК" },
    cancel: { en: "Cancel", ru: "Отмена" },
    close: { en: "Close", ru: "Закрыть" },
    save: { en: "Save", ru: "Сохранить" },
    delete: { en: "Delete", ru: "Удалить" },
    create: { en: "Create", ru: "Создать" },
    overwrite: { en: "Overwrite", ru: "Перезаписать" },
    loading: { en: "Loading...", ru: "Загрузка..." },
    error: { en: "Error", ru: "Ошибка" },
    add: { en: "Add", ru: "Добавить" },
  },
  command: {
    openProjectDiagram: {
      en: "OpenFB: Open project diagram",
      ru: "OpenFB: Открыть диаграмму проекта",
    },
  },
  extension: {
    description: {
      en: "Edits an IEC 61499 project diagram based on .sys file, fbt elements and deploys it to PLC",
      ru: "Редактирует диаграмму IEC 61499 проекта на основе .sys файла, fbt элементов и загружает проект в ПЛК",
    },
  },
  toolbar: {
    createFb: { en: "* Create FB", ru: "* Создать FB" },
    addFb: { en: "+ Add FB", ru: "+ Добавить FB" },
    generateFboot: { en: "Generate FBOOT", ru: "Создать FBOOT" },
    deploy: { en: "Deploy", ru: "Деплой" },
    saveAs: { en: "Save As", ru: "Сохранить как" },
    settings: { en: "Settings", ru: "Настройки" },
    settingsTooltip: { en: "Open settings", ru: "Открыть настройки" },
  },
  panel: {
    typeLibrary: {
      title: { en: "Type Library", ru: "Библиотека типов" },
      closed: { en: "Library is closed", ru: "Библиотека закрыта" },
      loading: {
        en: "Loading type library...",
        ru: "Загружаю библиотеку типов...",
      },
      empty: {
        en: "No block types available",
        ru: "Нет доступных типов блоков",
      },
    },
    devices: {
      title: { en: "Devices", ru: "Устройства" },
      empty: { en: "No devices", ru: "Нет устройств" },
    },
    blockInfo: {
      title: { en: "Block info", ru: "Информация о блоке" },
      selectBlock: {
        en: "Select a block on the diagram",
        ru: "Выберите блок на диаграмме",
      },
      notFound: { en: "Block not found", ru: "Блок не найден" },
    },
    settings: {
      title: { en: "Plugin settings", ru: "Настройки плагина" },
      emptyPaths: { en: "Path list is empty", ru: "Список путей пуст" },
      addPath: { en: "+ Add path", ru: "+ Добавить путь" },
      pathLocked: { en: "Cannot remove", ru: "Нельзя удалить" },
      pathDelete: { en: "Remove path", ru: "Удалить путь" },
    },
  },
  field: {
    name: { en: "Name", ru: "Имя" },
    type: { en: "Type", ru: "Тип" },
    class: { en: "Class", ru: "Класс" },
    position: { en: "Position", ru: "Позиция" },
    inputs: { en: "Inputs", ru: "Входы" },
    outputs: { en: "Outputs", ru: "Выходы" },
    parameters: { en: "Parameters", ru: "Параметры" },
    resources: { en: "Resources", ru: "Ресурсы" },
    language: { en: "Language", ru: "Язык" },
  },
  hint: {
    toggleInputs: { en: "Expand/collapse inputs", ru: "Раскрыть/скрыть входы" },
    toggleOutputs: {
      en: "Expand/collapse outputs",
      ru: "Раскрыть/скрыть выходы",
    },
    toggleParameters: {
      en: "Expand/collapse parameters",
      ru: "Раскрыть/скрыть параметры",
    },
    toggleResources: {
      en: "Expand/collapse resources",
      ru: "Раскрыть/скрыть ресурсы",
    },
    toggleFbList: {
      en: "Expand/collapse FB list",
      ru: "Раскрыть/скрыть список FB",
    },
    toggleConnections: {
      en: "Expand/collapse connection list",
      ru: "Раскрыть/скрыть список соединений",
    },
  },
  settings: {
    loadError: {
      en: "Failed to load settings",
      ru: "Ошибка загрузки настроек",
    },
    saved: { en: "Saved", ru: "Сохранено" },
    saving: { en: "Saving...", ru: "Сохранение..." },
    unsavedChanges: {
      en: "There are unsaved changes",
      ru: "Есть несохранённые изменения",
    },
    pathAlreadyAdded: { en: "Path is already added", ru: "Путь уже добавлен" },
    hostApiUnavailable: {
      en: "Host API is unavailable",
      ru: "Host API недоступен",
    },
    invalid: { en: "Invalid settings", ru: "Некорректные настройки" },
    pickPathLabel: { en: "Select", ru: "Выбрать" },
    pickPathTitle: {
      en: "Select folder or .fbt file",
      ru: "Выберите папку или .fbt файл",
    },
    pickPathError: {
      en: "Failed to select path",
      ru: "Не удалось выбрать путь",
    },
    saveFailed: {
      en: "Failed to save settings",
      ru: "Не удалось сохранить настройки",
    },
  },
  fbType: {
    creating: { en: "Creating type...", ru: "Создание типа..." },
    createdShort: { en: "FB type created", ru: "Тип FB создан" },
    createdWithPath: {
      en: "Type created: {filePath}",
      ru: "Тип создан: {filePath}",
    },
    createFailed: {
      en: "Failed to create FB type",
      ru: "Не удалось создать тип FB",
    },
    validationError: {
      en: "Check entered data",
      ru: "Проверьте введённые данные",
    },
    libraryLoadFailed: {
      en: "Failed to load type library: {error}",
      ru: "Не удалось загрузить библиотеку типов: {error}",
    },
    noDefinition: {
      en: "Type definition is missing or has no name",
      ru: "Определение типа отсутствует или не содержит имени",
    },
    fileExists: {
      en: "File \"{fileName}\" already exists. Overwrite?",
      ru: "Файл \"{fileName}\" уже существует. Перезаписать?",
    },
    cancelledByUser: {
      en: "Cancelled by user",
      ru: "Отменено пользователем",
    },
    saved: {
      en: "FB type saved: {filePath}",
      ru: "Тип ФБ сохранён: {filePath}",
    },
    loadFailed: {
      en: "Failed to load types",
      ru: "Не удалось загрузить типы",
    },
  },
  saveSys: {
    noModel: { en: "No model data", ru: "Нет данных модели" },
    dialogTitle: { en: "Save SYS file as", ru: "Сохранить SYS файл как" },
    saved: { en: "File saved: {path}", ru: "Файл сохранён: {path}" },
    saveFailed: {
      en: "Failed to save file: {error}",
      ru: "Не удалось сохранить файл: {error}",
    },
    unknownError: {
      en: "Unknown save error",
      ru: "Неизвестная ошибка сохранения",
    },
  },
  deploy: {
    createdMany: { en: "Files {names} created", ru: "Файлы {names} созданы" },
    createdOne: { en: "File {name} created", ru: "Файл {name} создан" },
    missingPrompt: {
      en: ".fboot file(s) not found: {names}. Create now?",
      ru: ".fboot файл(ы) не найдены: {names}. Создать сейчас?",
    },
    missingAfterGenerate: {
      en: "Failed to create .fboot file(s): {names}",
      ru: "Не удалось создать .fboot файл(ы): {names}",
    },
    completedMany: {
      en: "Deploy completed: {names}",
      ru: "Деплой завершён: {names}",
    },
    completedOne: {
      en: "Deploy completed: {name}",
      ru: "Деплой завершён: {name}",
    },
    failed: {
      en: "Deploy failed: {error}",
      ru: "Не удалось выполнить деплой: {error}",
    },
    error: { en: "Deploy error: {error}", ru: "Ошибка при деплое: {error}" },
    overwritePrompt: {
      en: ".fboot file(s) already exist in this project. Overwrite?",
      ru: "Файл .fboot уже существуют в данном проекте. Перезаписать его?",
    },
    abortedExisting: {
      en: "Deploy aborted by user: resource(s) already exist",
      ru: "Деплой прерван пользователем: ресурс(ы) уже существуют",
    },
    abort: { en: "Abort", ru: "Прервать" },
    resourcesExist: {
      en: "Resource(s) already exist on server: {resources}",
      ru: "Ресурс(ы) уже существуют на сервере: {resources}",
    },
    resourcesMissing: {
      en: "Resource(s) are missing on server: {resources}",
      ru: "Ресурс(ы) отсутствуют на сервере: {resources}",
    },
    continue: { en: "Continuing deploy.", ru: "Продолжаю деплой." },
    generateFailed: {
      en: "Failed to create FBOOT: {error}",
      ru: "Не удалось создать FBOOT: {error}",
    },
    noSuchObject: { en: "Object not found", ru: "Объект не найден" },
    errorUserMessage: {
      en: "OpenFB deploy error ({cmdLabel} {resource}): {msg}",
      ru: "Ошибка деплоя OpenFB ({cmdLabel} {resource}): {msg}",
    },
  },
  host: {
    noSysSelected: { en: "No SYS file selected", ru: "Не выбран SYS-файл" },
    fileOutsideWorkspace: {
      en: "File is outside workspace",
      ru: "Файл не находится в рабочей области",
    },
    failedSendToWebview: {
      en: "Failed to send data to webview: {error}",
      ru: "Не удалось отправить данные вебвью: {error}",
    },
    genericError: { en: "Error: {error}", ru: "Ошибка: {error}" },
    dirtyMark: { en: "(modified)", ru: "(изм)" },
    modelLoadError: { en: "Model load error", ru: "Ошибка загрузки модели" },
  },
  validation: {
    invalidValue: { en: "Invalid value", ru: "Некорректное значение" },
    hostRequired: {
      en: "Host must not be empty",
      ru: "Host не должен быть пустым",
    },
    portRange: {
      en: "Port must be between 1 and 65535",
      ru: "Port должен быть от 1 до 65535",
    },
    timeoutMin: {
      en: "Timeout must be at least 1000 ms",
      ru: "Timeout должен быть не меньше 1000 мс",
    },
    fbName: {
      empty: {
        en: "{label} cannot be empty",
        ru: "{label} не может быть пустым",
      },
      invalidChars: {
        en: "{label} contains invalid characters. Allowed: letters, digits, underscore; first character must be a letter or _",
        ru: "{label} содержит недопустимые символы. Допускаются буквы, цифры, подчёркивание; первый символ - буква или _",
      },
      noDoubleUnderscore: {
        en: "{label} must not contain double underscore (__)",
        ru: "{label} не должно содержать двойное подчёркивание (__)",
      },
      noTrailingUnderscore: {
        en: "{label} must not end with underscore",
        ru: "{label} не должно заканчиваться подчёркиванием",
      },
      reservedKeyword: {
        en: "{label} is a reserved keyword",
        ru: "{label} является зарезервированным ключевым словом",
      },
      label: { en: "FB type name", ru: "Имя типа FB" },
    },
    param: {
      bool: {
        en: "BOOL: allowed values are TRUE, FALSE, 0, 1",
        ru: "BOOL: допустимые значения TRUE, FALSE, 0, 1",
      },
      unknownType: {
        en: "Unknown type {typeName}",
        ru: "Неизвестный тип {typeName}",
      },
      integerExpected: {
        en: "{typeName}: integer expected",
        ru: "{typeName}: ожидается целое число",
      },
      unsignedExpected: {
        en: "{typeName}: non-negative integer expected",
        ru: "{typeName}: ожидается целое неотрицательное число",
      },
      floatExpected: {
        en: "{typeName}: floating-point number expected",
        ru: "{typeName}: ожидается число с плавающей точкой",
      },
      outOfRange: {
        en: "{typeName}: value out of range [{min} .. {max}]",
        ru: "{typeName}: значение вне диапазона [{min} .. {max}]",
      },
      outOfAllowedRange: {
        en: "{typeName}: value outside allowed range",
        ru: "{typeName}: значение вне допустимого диапазона",
      },
      realRange: {
        en: "REAL: value outside +-3.4028235E+38",
        ru: "REAL: значение вне диапазона +-3.4028235E+38",
      },
      hexOrInteger: {
        en: "{typeName}: integer or hex expected (16#FF)",
        ru: "{typeName}: ожидается целое число или hex (16#FF)",
      },
      stringExpected: {
        en: "STRING: string expected (for example, 'text')",
        ru: "STRING: ожидается строка (например, 'text')",
      },
      wstringExpected: {
        en: 'WSTRING: string expected (for example, "text")',
        ru: 'WSTRING: ожидается строка (например, "text")',
      },
      charExpected: {
        en: "CHAR: single character expected ('x')",
        ru: "CHAR: ожидается один символ ('x')",
      },
      wcharExpected: {
        en: 'WCHAR: single character expected ("x")',
        ru: 'WCHAR: ожидается один символ ("x")',
      },
      timeExpected: {
        en: "{typeName}: expected format T#5s, T#100ms, T#1h2m3s",
        ru: "{typeName}: ожидается формат T#5s, T#100ms, T#1h2m3s",
      },
      dateExpected: {
        en: "{typeName}: expected format D#YYYY-MM-DD",
        ru: "{typeName}: ожидается формат D#YYYY-MM-DD",
      },
      todExpected: {
        en: "{typeName}: expected format TOD#HH:MM:SS",
        ru: "{typeName}: ожидается формат TOD#HH:MM:SS",
      },
      dtExpected: {
        en: "{typeName}: expected format DT#YYYY-MM-DD-HH:MM:SS",
        ru: "{typeName}: ожидается формат DT#YYYY-MM-DD-HH:MM:SS",
      },
    },
  },
  canvas: {
    emptyDiagram: { en: "No nodes loaded", ru: "Узлы не загружены" },
  },
  legend: {
    title: { en: "LEGEND", ru: "ЛЕГЕНДА" },
    event: { en: "Event (E)", ru: "Событие (E)" },
    data: { en: "Data (D)", ru: "Данные (D)" },
    eventConnection: { en: "Event conn.", ru: "Соб. связь" },
    dataConnection: { en: "Data conn.", ru: "Дан. связь" },
    nodes: { en: "Nodes", ru: "Узлы" },
    zoom: { en: "Zoom", ru: "Масштаб" },
  },
  newFbDialog: {
    titleWithStep: {
      en: "Creating new FB type — Step {step}/{maxStep}",
      ru: "Создание нового типа FB — Шаг {step}/{maxStep}",
    },
    title: {
      en: "Creating new FB type",
      ru: "Создание нового типа FB",
    },
    renderError: {
      en: "Failed to render dialog. Check console.",
      ru: "Не удалось отрисовать диалог. Проверьте консоль.",
    },
    sectionBasic: { en: "General", ru: "Основное" },
    fbTypeName: { en: "FB type name", ru: "Имя типа FB" },
    category: { en: "Category", ru: "Категория" },
    commentOptional: { en: "Comment (optional)", ru: "Комментарий (опционально)" },
    next: { en: "Next →", ru: "Далее →" },
    back: { en: "← Back", ru: "← Назад" },
    creating: { en: "Creating...", ru: "Создание..." },
    addAlgorithm: { en: "+ Algorithm", ru: "+ Алгоритм" },
  },
  interfaceEditor: {
    namePlaceholder: { en: "Name", ru: "Имя" },
    noneSelected: { en: "(none selected)", ru: "(не выбраны)" },
    addItem: { en: "+ add", ru: "+ добавить" },
  },
} as const;

/** Convert unknown language-like input to a supported language value. */
export function resolveLanguage(value: unknown): UiLanguage {
  return value === "ru" ? "ru" : "en";
}

/** Replace placeholders in a template using params. */
function formatTemplate(template: string, params?: I18nParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, paramName: string) => {
    const value = params[paramName];
    return value === null || value === undefined
      ? `{${paramName}}`
      : String(value);
  });
}

/** Main typed translation function. */
export function t(
  language: UiLanguage,
  key: string,
  params?: I18nParams,
): string {
  const found = resolveEntry(key);
  const template = found?.[language] ?? found?.en ?? key;
  return formatTemplate(template, params);
}



/** Runtime type guard: checks whether a value is a translation leaf node. */
function isTranslationEntry(value: unknown): value is TranslationEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<Record<UiLanguage, unknown>>;
  return typeof candidate.ru === "string" && typeof candidate.en === "string";
}

/** Get translation leaf by dot path (for example: `common.ok`). */
function getEntryByPath(
  root: ResourceTree,
  path: string,
): TranslationEntry | undefined {
  const parts = path.split(".").filter(Boolean);
  let cursor: TranslationEntry | ResourceTree = root;

  for (const part of parts) {
    if (!cursor || isTranslationEntry(cursor)) {
      return undefined;
    }

    const branch = cursor as ResourceTree;
    const next: TranslationEntry | ResourceTree | undefined = branch[part];
    if (!next) {
      return undefined;
    }

    cursor = next;
  }

  return isTranslationEntry(cursor) ? cursor : undefined;
}

/** Resolve entry by dot path from top-level resources. */
function resolveEntry(path: string): TranslationEntry | undefined {
  return getEntryByPath(resources, path);
}


