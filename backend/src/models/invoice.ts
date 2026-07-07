export interface Invoice {
  id: string
  factura: string
  fecha: string
  proveedor?: string
  cliente?: string
  nitProveedor?: string
  nitCliente?: string
  paciente: string
  documentoPaciente: string
  medico?: string
  valor: number
  tipo: 'compra' | 'venta'
  xmlPath?: string
  cufe?: string
  importada: string
  periodo?: string
}

export interface Conciliation {
  id: string
  facturaCompra: string
  facturaVenta: string
  paciente: string
  documentoPaciente: string
  proveedor: string
  cliente: string
  valorCompra: number
  valorVenta: number
  diferencia: number
  estado: 'conciliada' | 'revisar' | 'pendiente'
  fechaCompra: string
  fechaVenta: string
  puntaje: number
  motivo: string
  periodo?: string
}

export interface AppConfig {
  nitEmpresa: string
  nombreEmpresa: string
}

export interface PeriodSummary {
  periodo: string
  mes: number
  anio: number
  totalCompras: number
  totalVentas: number
  totalConciliado: number
  totalPendiente: number
  countCompras: number
  countVentas: number
  countConciliadas: number
  countPendientes: number
  updatedAt: string
}

export interface PeriodReport {
  periodo: string
  mes: number
  anio: number
  conciliaciones: Conciliation[]
  comprasSinVenta: Conciliation[]
  ventasSinCompra: Conciliation[]
  conciliadas: Conciliation[]
  pendientes: Conciliation[]
  totalCompra: number
  totalVenta: number
  diferencia: number
  updatedAt: string
}
