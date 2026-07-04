import type { Invoice, Conciliation } from '../models/invoice.js'

function normDoc(s: string): string {
  return s.toLowerCase().trim().replace(/[^0-9]/g, '')
}

export function reconcile(
  compras: Invoice[],
  ventas: Invoice[]
): Conciliation[] {
  const conciliations: Conciliation[] = []
  const usedVentas = new Set<string>()
  const usedCompras = new Set<string>()

  const sortByDate = (items: Invoice[]) =>
    [...items].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  const comprasSorted = sortByDate(compras)
  const ventasSorted = sortByDate(ventas)

  // Emparejar por documento del paciente
  for (const compra of comprasSorted) {
    if (usedCompras.has(compra.id)) continue
    const docC = normDoc(compra.documentoPaciente)
    if (!docC) continue

    for (const venta of ventasSorted) {
      if (usedVentas.has(venta.id)) continue
      const docV = normDoc(venta.documentoPaciente)
      if (!docV || docC !== docV) continue

      usedCompras.add(compra.id)
      usedVentas.add(venta.id)
      const diff = compra.valor - venta.valor

      conciliations.push({
        id: `${compra.id}_${venta.id}`,
        facturaCompra: compra.factura,
        facturaVenta: venta.factura,
        paciente: compra.paciente || venta.paciente,
        documentoPaciente: compra.documentoPaciente || venta.documentoPaciente,
        proveedor: compra.proveedor || '',
        cliente: venta.cliente || '',
        valorCompra: compra.valor,
        valorVenta: venta.valor,
        diferencia: diff,
        estado: 'conciliada',
        fechaCompra: compra.fecha,
        fechaVenta: venta.fecha,
        puntaje: 100,
        motivo: `Documento paciente ${compra.documentoPaciente} coincide`,
      })
      break
    }
  }

  // Compras sin match
  for (const compra of comprasSorted) {
    if (usedCompras.has(compra.id)) continue
    const parts: string[] = []
    if (!compra.documentoPaciente && !compra.paciente) {
      parts.push('No se pudo extraer información del paciente del XML')
    } else {
      if (compra.documentoPaciente) parts.push(`Documento: ${compra.documentoPaciente}`)
      if (compra.paciente) parts.push(`Paciente: ${compra.paciente}`)
      if (compra.valor > 0) parts.push(`Valor: $${compra.valor.toLocaleString('es-CO')}`)
      parts.push('No se encontró venta con el mismo documento')
    }

    conciliations.push({
      id: `${compra.id}_pendiente`,
      facturaCompra: compra.factura,
      facturaVenta: '',
      paciente: compra.paciente || '',
      documentoPaciente: compra.documentoPaciente || '',
      proveedor: compra.proveedor || '',
      cliente: '',
      valorCompra: compra.valor,
      valorVenta: 0,
      diferencia: compra.valor,
      estado: 'pendiente',
      fechaCompra: compra.fecha,
      fechaVenta: '',
      puntaje: 0,
      motivo: parts.join('. '),
    })
  }

  // Ventas sin match
  for (const venta of ventasSorted) {
    if (usedVentas.has(venta.id)) continue
    conciliations.push({
      id: `pendiente_${venta.id}`,
      facturaCompra: '',
      facturaVenta: venta.factura,
      paciente: venta.paciente || '',
      documentoPaciente: venta.documentoPaciente || '',
      proveedor: '',
      cliente: venta.cliente || '',
      valorCompra: 0,
      valorVenta: venta.valor,
      diferencia: -venta.valor,
      estado: 'pendiente',
      fechaCompra: '',
      fechaVenta: venta.fecha,
      puntaje: 0,
      motivo: !venta.documentoPaciente && !venta.paciente
        ? 'No se pudo extraer información del paciente del XML'
        : 'Venta sin compra con el mismo documento',
    })
  }

  return conciliations
}
