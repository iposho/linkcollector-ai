// Минимальное амбиентное описание Chrome Extensions API (MV3),
// покрывающее вызовы, которые реально используются в TS-коде проекта.
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    }
    const local: StorageArea;
    const session: StorageArea;
    const onChanged: {
      addListener(
        callback: (
          changes: { [key: string]: { oldValue?: any; newValue?: any } },
          areaName: string,
        ) => void,
      ): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      windowId?: number;
      lastAccessed?: number;
      active?: boolean;
    }
    function get(tabId: number): Promise<Tab>;
    function query(queryInfo: object): Promise<Tab[]>;
    function update(tabId: number, updateProperties: object, callback?: (tab?: Tab) => void): void;
    function captureVisibleTab(windowId: number, options: object, callback: (dataUrl: string) => void): void;
    function captureVisibleTab(windowId: number, options: object): Promise<string>;
  }

  namespace scripting {
    function executeScript(details: object): Promise<any[]>;
  }

  namespace runtime {
    const lastError: { message: string } | undefined;
    function sendMessage(message: any, callback?: (response: any) => void): void;
    const onMessage: {
      addListener(listener: (message: any, sender: any, sendResponse: (response?: any) => void) => any): void;
    };
  }
}
