export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: string): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('es-CO')
}

export function getYear(date: string): number {
  return new Date(date).getFullYear()
}

export function getMonth(date: string): number {
  return new Date(date).getMonth() + 1
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1] || ''
}
