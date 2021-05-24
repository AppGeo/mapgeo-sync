// import type { IpcRendererEvent } from 'electron';

// Types for compiled templates
declare module 'mapgeo-sync/templates/*' {
  import { TemplateFactory } from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}

// declare function requireNode(path: 'electron'): {
//   ipcRenderer: {
//     send(event: string, data?: unknown): void;
//     on(
//       event: string,
//       cb: (event: IpcRendererEvent, data?: unknown) => void
//     ): void;
//   };
// };
declare function requireNode(path: string): any;

// https://github.com/microsoft/TypeScript/issues/35865#issuecomment-763866416
declare namespace Intl {
  interface DateTimeFormatOptions {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
}
