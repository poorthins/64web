/**
 * useNaturalGasMeter - 天然氣錶號管理 Hook
 */

import { useState } from 'react'
import { NaturalGasMeter } from '../../../types/naturalGasTypes'
import { v4 as uuidv4 } from 'uuid'

export function useNaturalGasMeter() {
  const [meters, setMeters] = useState<NaturalGasMeter[]>([])
  const [newMeterInput, setNewMeterInput] = useState('')

  const addMeter = () => {
    if (!newMeterInput.trim()) return

    const newMeter: NaturalGasMeter = {
      id: uuidv4(),
      meterNumber: newMeterInput.trim()
    }

    setMeters(prev => [...prev, newMeter])
    setNewMeterInput('')
  }

  const deleteMeter = (meterId: string) => {
    setMeters(prev => prev.filter(m => m.id !== meterId))
  }

  const reset = () => {
    setMeters([])
    setNewMeterInput('')
  }

  return {
    meters,
    setMeters,
    newMeterInput,
    setNewMeterInput,
    addMeter,
    deleteMeter,
    reset
  }
}
