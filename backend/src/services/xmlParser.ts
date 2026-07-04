import { XMLParser } from 'fast-xml-parser'
import type { Invoice } from '../models/invoice.js'
import { parsePatientFromNote } from './patientParser.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['InvoiceLine', 'cac:InvoiceLine'].includes(name),
  cdataPropName: '__cdata',
  trimValues: true,
})

function extractInnerInvoice(raw: Record<string, unknown>): Record<string, unknown> | null {
  const findInvoice = (obj: Record<string, unknown>): Record<string, unknown> | null => {
    if (!obj || typeof obj !== 'object') return null

    const keys = Object.keys(obj)
    const invoiceKey = keys.find(k => k.includes('Invoice'))
    if (invoiceKey) {
      const val = obj[invoiceKey]
      if (val && typeof val === 'object') return val as Record<string, unknown>
    }

    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        const found = findInvoice(val as Record<string, unknown>)
        if (found) return found
      }
    }
    return null
  }

  return findInvoice(raw)
}

function getText(obj: Record<string, unknown> | undefined | null, ...keys: string[]): string {
  if (!obj) return ''
  for (const key of keys) {
    const val = obj[key]
    if (val && typeof val === 'object') {
      const text = (val as Record<string, unknown>)['#text']
      if (text) return String(text).trim()
      return ''
    }
    if (val !== undefined && val !== null) {
      return String(val).trim()
    }
  }
  return ''
}

function getNested(obj: Record<string, unknown> | undefined | null, path: string): Record<string, unknown> | null {
  if (!obj) return null
  const parts = path.split('.')
  let current: Record<string, unknown> | undefined = obj
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null
    const val = current[part]
    if (!val || typeof val !== 'object') return null
    current = val as Record<string, unknown>
  }
  return current ?? null
}

function findValue(obj: Record<string, unknown> | undefined, ...paths: string[]): string {
  if (!obj) return ''
  for (const path of paths) {
    const parts = path.split('.')
    let current: Record<string, unknown> | undefined = obj
    let found = true
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        found = false
        break
      }
      const val = current[part]
      if (val === undefined || val === null) {
        found = false
        break
      }
      if (typeof val === 'object') {
        current = val as Record<string, unknown>
        const textVal = current['#text']
        if (textVal !== undefined) {
          return String(textVal).trim()
        }
      } else {
        return String(val).trim()
      }
    }
    if (found && current && typeof current === 'object') {
      return ''
    }
  }
  return ''
}

export function parseXMLFile(
  content: string,
  fileName: string,
  nitEmpresa: string
): Invoice | null {
  try {
    const raw = parser.parse(content) as Record<string, unknown>

    const attachedDoc = raw['AttachedDocument'] || raw['attachedDocument'] || raw
    const attachedDocObj = attachedDoc as Record<string, unknown>

    let invoiceData: Record<string, unknown> | null = null

    if (attachedDocObj['cac:Attachment'] || attachedDocObj['Attachment']) {
      const attachment = attachedDocObj['cac:Attachment'] as Record<string, unknown> | undefined
        ?? attachedDocObj['Attachment'] as Record<string, unknown> | undefined

      if (attachment) {
        const extRef = attachment['cac:ExternalReference'] as Record<string, unknown> | undefined
          ?? attachment['ExternalReference'] as Record<string, unknown> | undefined
        if (extRef) {
          const desc = extRef['cbc:Description'] as Record<string, unknown> | undefined
            ?? extRef['Description'] as Record<string, unknown> | undefined
          if (desc && desc['__cdata']) {
            const cdataContent = desc['__cdata'] as string
            const innerParsed = parser.parse(cdataContent) as Record<string, unknown>
            invoiceData = extractInnerInvoice(innerParsed)
          }
        }
      }
    }

    if (!invoiceData) {
      invoiceData = extractInnerInvoice(attachedDocObj)
    }

    if (!invoiceData) return null

    const prefixes = ['cbc:', '']
    const cacPrefixes = ['cac:', '']
    const cacInvoiceLinePrefix = 'cac:'

    const factura = findValue(invoiceData, 'cbc:ID', 'ID')
    const fecha = findValue(invoiceData, 'cbc:IssueDate', 'IssueDate')
    const nota = findValue(invoiceData, 'cbc:Note', 'Note')
    const valorStr = findValue(invoiceData, 'cac:LegalMonetaryTotal.cbc:PayableAmount', 'LegalMonetaryTotal.PayableAmount', 'cbc:PayableAmount', 'PayableAmount')
    const valor = parseFloat(valorStr) || 0

    const supplierParty = getNested(invoiceData, 'cac:AccountingSupplierParty')
      ?? getNested(invoiceData, 'AccountingSupplierParty')
    const customerParty = getNested(invoiceData, 'cac:AccountingCustomerParty')
      ?? getNested(invoiceData, 'AccountingCustomerParty')

    const supplierLegal = getNested(supplierParty, 'cac:Party.cac:PartyLegalEntity')
      ?? getNested(supplierParty, 'cac:Party.cac:PartyTaxScheme')
      ?? getNested(supplierParty, 'Party.PartyLegalEntity')
      ?? getNested(supplierParty, 'Party.PartyTaxScheme')

    const customerLegal = getNested(customerParty, 'cac:Party.cac:PartyLegalEntity')
      ?? getNested(customerParty, 'cac:Party.cac:PartyTaxScheme')
      ?? getNested(customerParty, 'Party.PartyLegalEntity')
      ?? getNested(customerParty, 'Party.PartyTaxScheme')

    const supplierName = getText(supplierLegal, 'cbc:RegistrationName', 'RegistrationName')
    const supplierNIT = getText(supplierLegal, 'cbc:CompanyID', 'CompanyID')
    const customerName = getText(customerLegal, 'cbc:RegistrationName', 'RegistrationName')
    const customerNIT = getText(customerLegal, 'cbc:CompanyID', 'CompanyID')

    const cufe = findValue(invoiceData, 'cbc:UUID', 'UUID')

    const pacienteInfo = parsePatientFromNote(nota)

    const supplierNITClean = supplierNIT.replace(/\s/g, '')
    const customerNITClean = customerNIT.replace(/\s/g, '')
    const empresaNITClean = nitEmpresa.replace(/\s/g, '')

    let tipo: 'compra' | 'venta' = 'compra'
    let proveedor = supplierName
    let nitProveedor = supplierNITClean
    let cliente = customerName
    let nitCliente = customerNITClean

    if (supplierNITClean === empresaNITClean) {
      tipo = 'venta'
      proveedor = ''
      nitProveedor = ''
    } else if (customerNITClean === empresaNITClean) {
      tipo = 'compra'
      cliente = ''
      nitCliente = ''
    }

    const id = `${factura}_${fecha}`

    return {
      id,
      factura,
      fecha,
      proveedor: tipo === 'compra' ? proveedor : undefined,
      cliente: tipo === 'venta' ? cliente : undefined,
      nitProveedor: tipo === 'compra' ? nitProveedor : undefined,
      nitCliente: tipo === 'venta' ? nitCliente : undefined,
      paciente: pacienteInfo.nombre || nota || 'Sin paciente',
      documentoPaciente: pacienteInfo.documento || '',
      medico: pacienteInfo.medico,
      valor,
      tipo,
      xmlPath: fileName,
      cufe,
      importada: new Date().toISOString(),
    }
  } catch (e) {
    console.error('Error parsing XML:', fileName, e)
    return null
  }
}
