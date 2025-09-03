export const calculateCarbonEmission = (
  amount: number,
  emissionFactor: number
): number => {
  return amount * emissionFactor
}

export const formatEmission = (emission: number): string => {
  return `${emission.toFixed(2)} kg CO2e`
}

export const convertUnits = (
  value: number,
  fromUnit: string,
  toUnit: string
): number => {
  const conversionFactors: Record<string, Record<string, number>> = {
    energy: {
      'kWh-MWh': 0.001,
      'MWh-kWh': 1000,
    },
    distance: {
      'km-m': 1000,
      'm-km': 0.001,
    },
  }
  
  const category = Object.keys(conversionFactors).find(cat =>
    conversionFactors[cat][`${fromUnit}-${toUnit}`]
  )
  
  if (category && conversionFactors[category][`${fromUnit}-${toUnit}`]) {
    return value * conversionFactors[category][`${fromUnit}-${toUnit}`]
  }
  
  return value
}