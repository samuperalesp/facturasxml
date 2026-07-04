export interface PatientInfo {
  nombre: string
  documento: string
  medico?: string
}

export function parsePatientFromNote(note: string): PatientInfo {
  const info: PatientInfo = { nombre: '', documento: '' }
  if (!note) return info

  const patterns = [
    /Paciente\s*:?\s*([^-\n]+?)\s*-\s*ID:?\s*(?:[A-Za-z]+\s*)?(\d+)/i,
    /PAC\s*:?\s*([^-\n]+?)\s*-?\s*ID:?\s*(?:[A-Za-z]+\s*)?(\d+)/i,
    /PACIENTE\s*:?\s*([^-\n]+?)\s*-\s*ID:?\s*(?:[A-Za-z]+\s*)?(\d+)/i,
    /PAC\s*:?\s*([^-\n]+?)\s*-\s*(\d{5,})/i,
    /Paciente:\s*([^-\n]+?)\s*-\s*(\d{5,})/i,
    /PAC\s*[:]\s*([A-ZÁÉÍÓÚÑ\s]+?)\s+-+\s*(\d{5,})/i,
    /NOMBRE\s+DEL\s+PACIENTE\s*:\s*([^-\n]+?)(?:\s*-\s*|$)/i,
    /PAC[.:]?\s*(?:NOMBRE\s+)?(?:DEL\s+)?\s*([A-ZÁÉÍÓÚÑ\s]+?)\s{2,}(\d{5,})/i,
  ]

  for (const pattern of patterns) {
    const match = note.match(pattern)
    if (match) {
      info.nombre = match[1].trim()
      info.documento = match[2].trim().replace(/\D/g, '')
      break
    }
  }

  if (!info.documento) {
    const docPatterns = [
      /CC\s*(\d{5,})/i,
      /C\.?C\.?\s*(\d{5,})/i,
      /CEDULA\s*(\d{5,})/i,
      /IDENTIFICACION\s*(\d{5,})/i,
      /DOCUMENTO\s*(\d{5,})/i,
      /ID\s*(\d{6,})/i,
      /I\s*D\s*(\d{6,})/i,
      /(\d{6,15})/,
    ]
    for (const pattern of docPatterns) {
      const match = note.match(pattern)
      if (match) {
        info.documento = match[1].trim().replace(/\D/g, '')
        if (info.documento.length >= 6) break
      }
    }
  }

  if (!info.nombre && info.documento) {
    const docIdx = note.indexOf(info.documento)
    const pacIdx = note.search(/PAC\s*:?\s*/i)
    if (docIdx > 0 && pacIdx >= 0) {
      let between = note.substring(pacIdx, docIdx).replace(/PAC\s*:?\s*/i, '').trim()
      between = between.replace(/[-—]\s*(?:ID|I\s*D)\s*$/i, '').trim()
      between = between.replace(/[-—]\s*[A-ZÁÉÍÓÚÑ\s]+\s*$/i, '').trim()
      if (between) info.nombre = between
    }
  }

  if (!info.nombre && !info.documento) {
    info.nombre = note.replace(/\s+/g, ' ').trim().substring(0, 100)
  }

  const medicoPatterns = [
    /Médico:\s*(.+)/i,
    /Medico:\s*(.+)/i,
    /DR:\s*([^-\n]+)/i,
    /MEDICO\s*[:]\s*([A-ZÁÉÍÓÚÑ\s]+)/i,
  ]

  for (const pattern of medicoPatterns) {
    const match = note.match(pattern)
    if (match) {
      info.medico = match[1].trim().replace(/-RM\s*\S+/i, '').trim()
      break
    }
  }

  return info
}
