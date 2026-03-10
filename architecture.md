flowchart LR
  U[User in VS Code] --> CMD[OpenFB command]

  subgraph HOST[Extension Host]
    EXT[src/host/extension.ts]
    PM[src/host/panelManager.ts]
    WR[src/host/messageRouter.ts]
    DL[src/host/diagramLoader.ts]

    PARSE[src/host/parsing/*]
    REG[src/host/fbTypeRegistry.ts]
    H_SAVE[src/host/handlers/saveSysHandler.ts]
    H_DEP[src/host/handlers/deployHandler.ts]
    H_FBT[src/host/handlers/fbTypeHandler.ts]
    H_SET[src/host/handlers/settingsHandler.ts]
    GEN[src/host/generation/*]
    DEP[src/host/deploy/*]
  end

  subgraph SHARED[Shared]
    SH[src/shared/models/* + shared utils]
  end

  subgraph WEBVIEW[Webview]
    MAIN[src/webview/main.ts]
    MSGH[src/webview/handlers/messageHandler.ts]
    ES[src/webview/editorState.ts]
    INP[src/webview/input/*]
    HAND[src/webview/handlers/*]
    RND[src/webview/rendering/*]
    ST[src/webview/store/*]
    PAN[src/webview/panels/*]
  end

  CMD --> EXT
  EXT --> PM
  PM --> DL
  DL --> PARSE
  DL --> REG
  PM --> WR

  WR --> H_SAVE
  WR --> H_DEP
  WR --> H_FBT
  WR --> H_SET
  H_DEP --> GEN
  H_DEP --> DEP

  HOST <--> SHARED
  WEBVIEW <--> SHARED

  PM --> MAIN
  MAIN --> MSGH
  MAIN --> ES
  ES --> INP
  ES --> HAND
  ES --> RND
  ES --> ST
  ES --> PAN

  MAIN -->|ready\nrequest-all-fb-types\nsave-sys\ngenerateFboot\ndeploy\nsettings:load\nsettings:save\nsettings:pick-path\ndirty-state-changed\ncreate-fb-type| WR
  WR -->|load-diagram\nall-fb-types-loaded\nall-fb-types-error\nsave-sys-result\nsettings:loaded\nsettings:saved\nsettings:path-picked\nsettings:error\ncreate-fb-type-result| MSGH