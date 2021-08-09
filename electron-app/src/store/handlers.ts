import { IpcMain } from 'electron';
import { Source, SyncRule } from 'mapgeo-sync-config';
import { store } from '../store/store';

export function register(ipcMain: IpcMain) {
  const add = (name: string, handle: (...args: any[]) => any) =>
    ipcMain.handle(`store/${name}`, (event, ...args) => {
      return handle(...args);
    });

  add('findSyncRules', findSyncRules);
  add('addSyncRule', addSyncRule);
  add('removeSyncRule', removeSyncRule);
  add('findSyncState', findSyncState);
  add('findSources', findSources);
  add('addSource', addSource);
}

export const findSyncRules = () => {
  return store.get('syncRules') || [];
};

export const addSyncRule = (rule: SyncRule) => {
  let rules = store.get('syncRules');
  if (!rules) {
    rules = [];
  }
  rules.push(rule);
  store.set('syncRules', rules);
  return rules;
};

export const removeSyncRule = (rule: SyncRule) => {
  let rules = store.get('syncRules');
  if (!rules) {
    return [];
  }

  // Remove rule
  rules = rules.filter((item) => item.id !== rule.id);
  store.set('syncRules', rules);

  // Remove it's state
  let states = store.get('syncState') || [];
  states = states.filter((item) => item.ruleId !== rule.id);
  store.set('syncState', states);

  return rules;
};

export const findSyncState = () => {
  return store.get('syncState') || [];
};

export const findSources = () => {
  return store.get('sources') || [];
};

export const addSource = (source: Source) => {
  let sources = store.get('sources');
  if (!sources) {
    sources = [];
  }
  sources.push(source);
  store.set('sources', sources);
  return sources;
};
