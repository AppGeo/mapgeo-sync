// import { Role } from '../api';

type Role = unknown;

export type BasicField = {
  key: string;
  name: string;
};
export type ProviderConfig = {
  token: string;

  //carto
  apiKey?: string;
  account?: string;
  tablePrefix?: string;
  domain?: string;
  subdomainless?: boolean;

  //accela
  appId?: string;
  appSecret?: string;
  agency?: string;
  environment?: string;

  // docs
  docsUrl?: string;
  docsToken?: string;
};
export type CommunityDataProvider = {
  pk: string;
  name: string;
  isDefault: boolean;
  providerType: 'carto' | 'docs' | 'accela';
  config: ProviderConfig;
};
export type CommunitySettings = {
  logo: string;
  googleMapsKey: string;
  providers: CommunityDataProvider[];
  membership: {
    defaultRoleId: string;
    loginAccessOnly?: boolean;
    googleOauthDomain?: string;
    googleOauthAutoRegister?: boolean;
  };
  // TODO: make sure no configs are using and remove these
  property?: {
    fieldGroups: {}[];
  };
  pictometry: {
    apikey?: string;
  };
  efc?: {
    url?: string;
  };
};
export type Field = {
  key: string;
  property: string;
  template: string;
  required?: boolean;
  displayType?: 'image' | 'url';
  tip?: string;
  visibilityShow?: boolean;
  visibilityValues?: string[];
  // options for image and url types
  imageLinkUrl?: string;
  urlLabel?: string;
  newWindow?: boolean;
};

export interface FieldGroup {
  pk: string;
  name: string;
  type: 'default' | 'carousel' | 'table';
  source: string;
  required: boolean;
  collapsed: boolean;
  showCount: boolean;
  fields: Field[];
  filters: {
    type: 'distance' | 'intersect' | 'field';
    distance: number;
    value: string;
    sourceKey: string;
    datasetKey: string;
  }[];
  sortField: string;
  sortDescending: boolean;
  // for layoutType 'grid'
  gridColumns?: string;
  gridRows?: string;
}

export type DatasetLayout = {
  pk: string;
  type: 'itemPreview' | 'itemDetails';
  name: string;
  layoutType: 'default';
  headerType: 'none' | 'streetview' | 'image';
  fieldGroups: FieldGroup[];

  // if headerType is image
  headerImageUrlTemplate?: string;
};
export type DatasourceProvider = {
  pk: string;
  resource: string;
};
export type MappingTypeId =
  | 'date'
  | 'datetime'
  | '2decimals'
  | 'integer'
  | 'yesno';
export type TableMappingColumn = {
  key: string;
  column: string;
  description: string;
  required: boolean;
  type?: MappingTypeId;
  format?: string;
  formatOptions?: unknown;
};

export type TableMapping = {
  pk: string;
  name: string;
  required?: boolean;
  multiTable: boolean;
  needsJoinKey: boolean;
  joinKey?: string;
  otherKeys: string[];
  columns: TableMappingColumn[];
  provider: DatasourceProvider;
  filters: {
    type: 'field' | 'distance' | 'intersect';
    key: string;
    value: string;
  }[];
};
export type SearchField = {
  key: string;
  name: string;

  type: 'quicksearch' | 'range' | 'select';
  placeholder?: string;

  // range only options
  rangeStep?: number;
};

export type Dataset = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  published: boolean;
  configUpdated: Date;
  dataMapping: TableMapping;
  intersectionMapping: TableMapping;
  geometryMapping: TableMapping;
  tableMappings: TableMapping[];
  map: {
    maxZoomLevel?: number;
    abuttersFeetDistanceMax?: number;
    downloadItemsMax?: number;
    abuttersFeetDistance: number;
    propertyZoomLevel: number;
    thematicMaps: {
      pk: string;
      name: string;
      layers: string[];
    }[];
    layers: {
      pk: string;
      legendImage?: string;
      attribution?: string;
      url?: string;
      type?: 'CARTO';
    }[];
  };
  abutterCards: {
    pk: string;
    name: string;
    icon: string;
    color: string;
    source: string;
    primaryFieldKey: string;
    secondaryFieldKey: string;
    identifierFieldKey: string;
  }[];
  fieldGroups: FieldGroup[];
  links: {
    pk: string;
    name: string;
    template: string;
  }[];
  layouts: {
    itemPreview?: DatasetLayout;
    itemDetails?: DatasetLayout[];
  };
  downloads: {
    enableAbuttersReport: boolean;
    enableAbuttersReportSignature: boolean;
    labelTemplate: string;
    spreadsheetFields: Field[];
    abuttersReportFields: Field[];
    printFields: Field[];
  };
  search: {
    place?: string;
    searchFields: SearchField[];
    tabularFields: BasicField[];
    cardFields: BasicField[];
  };
  uploader: {
    optinExperimental?: boolean;
    optinExperimentalIntersection?: boolean;
    geometryUpdatedDate?: string;
    dataUpdatedDate?: string;
    lastSyncRunDate?: Date;
  };
};
export type DatasetLite = Pick<
  Dataset,
  'id' | 'name' | 'icon' | 'color' | 'published' | 'configUpdated'
>;
export interface CommunityConfig {
  id: string;
  name: string;
  subdomain: string;
  settings: CommunitySettings;
  datasets: Dataset[];
  anonymousRole?: Role;
  published_on?: Date;
  published_by?: string;
  config_id: string;
  previous: unknown;
  // Only in the response
  lastSyncRunDate?: Date;
  // put here for api
  save: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
}
export type CommunityConfigSimplified = Omit<
  CommunityConfig,
  'datasets' | 'settings'
> & {
  datasets: DatasetLite[];
  settings: Omit<CommunitySettings, 'providers'> & {
    providers?: CommunityDataProvider[];
  };
};
