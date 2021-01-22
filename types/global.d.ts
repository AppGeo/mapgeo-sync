// Types for compiled templates
declare module 'mapgeo-sync/templates/*' {
  import { TemplateFactory } from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}

declare function requireNode(path: string): any;
