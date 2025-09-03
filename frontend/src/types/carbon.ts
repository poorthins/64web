export interface CarbonEmission {
  id: string
  category: string
  activity: string
  amount: number
  unit: string
  emissionFactor: number
  totalEmission: number
  date: string
}

export interface EmissionCategory {
  id: string
  name: string
  description: string
  activities: Activity[]
}

export interface Activity {
  id: string
  name: string
  unit: string
  emissionFactor: number
}