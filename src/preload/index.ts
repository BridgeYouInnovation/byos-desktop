import { contextBridge, ipcRenderer } from 'electron'
import type { Lang } from '@core/i18n'
import type {
  LoginResult,
  TenantContextDTO,
  DashboardMetrics,
  WorkspaceRefs,
  RecordListItem,
  RecordDetailDTO,
  CreateSaleInput,
  CreateSimpleInput,
  MutationResult,
  ProductDTO,
  CreateProductInput,
  AdjustStockInput,
  StockMovementDTO,
  ContactDTO,
  CreateContactInput,
  ReportSummary
} from '@core/dto'

// The single, audited surface the renderer is allowed to call into the main
// process. Everything is async (IPC). The data layer (SQLite) lives in main.
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  auth: {
    login: (identifier: string, password: string): Promise<LoginResult> =>
      ipcRenderer.invoke('auth:login', identifier, password),
    context: (): Promise<TenantContextDTO | null> => ipcRenderer.invoke('auth:context'),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout')
  },
  dashboard: {
    metrics: (): Promise<DashboardMetrics | null> => ipcRenderer.invoke('dashboard:metrics')
  },
  refs: {
    get: (): Promise<WorkspaceRefs> => ipcRenderer.invoke('refs:get')
  },
  records: {
    list: (kind?: string): Promise<RecordListItem[]> => ipcRenderer.invoke('records:list', kind),
    detail: (id: string): Promise<RecordDetailDTO | null> => ipcRenderer.invoke('records:detail', id),
    createSale: (input: CreateSaleInput): Promise<MutationResult> =>
      ipcRenderer.invoke('records:createSale', input),
    createIncome: (input: CreateSimpleInput): Promise<MutationResult> =>
      ipcRenderer.invoke('records:createIncome', input),
    createExpense: (input: CreateSimpleInput): Promise<MutationResult> =>
      ipcRenderer.invoke('records:createExpense', input)
  },
  stock: {
    products: (): Promise<ProductDTO[]> => ipcRenderer.invoke('stock:products'),
    createProduct: (input: CreateProductInput): Promise<MutationResult> =>
      ipcRenderer.invoke('stock:createProduct', input),
    adjust: (input: AdjustStockInput): Promise<MutationResult> => ipcRenderer.invoke('stock:adjust', input),
    movements: (productId?: string): Promise<StockMovementDTO[]> =>
      ipcRenderer.invoke('stock:movements', productId)
  },
  people: {
    list: (type?: string): Promise<ContactDTO[]> => ipcRenderer.invoke('people:list', type),
    create: (input: CreateContactInput): Promise<MutationResult> => ipcRenderer.invoke('people:create', input)
  },
  reports: {
    summary: (from: string, to: string): Promise<ReportSummary> =>
      ipcRenderer.invoke('reports:summary', from, to)
  },
  prefs: {
    getLang: (): Promise<Lang> => ipcRenderer.invoke('prefs:getLang'),
    setLang: (lang: Lang): Promise<void> => ipcRenderer.invoke('prefs:setLang', lang)
  }
}

contextBridge.exposeInMainWorld('byos', api)

export type ByosApi = typeof api
