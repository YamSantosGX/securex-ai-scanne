import { createContext, useContext, useState, ReactNode } from 'react';

export type Region = 'BR' | 'US' | 'DE' | 'FR' | 'ES' | 'IT';

export type RegionConfig = {
  code: Region;
  name: string;
  language: string;
  currency: string;
  priceMultiplier: number;
  currencySymbol: string;
};

export const REGIONS: Record<Region, RegionConfig> = {
  BR: {
    code: 'BR',
    name: 'Brasil',
    language: 'pt',
    currency: 'BRL',
    priceMultiplier: 24.90,
    currencySymbol: 'R$',
  },
  US: {
    code: 'US',
    name: 'USA',
    language: 'en',
    currency: 'USD',
    priceMultiplier: 9.99,
    currencySymbol: '$',
  },
  DE: {
    code: 'DE',
    name: 'Deutschland',
    language: 'de',
    currency: 'EUR',
    priceMultiplier: 9.99,
    currencySymbol: '€',
  },
  FR: {
    code: 'FR',
    name: 'France',
    language: 'fr',
    currency: 'EUR',
    priceMultiplier: 9.99,
    currencySymbol: '€',
  },
  ES: {
    code: 'ES',
    name: 'España',
    language: 'es',
    currency: 'EUR',
    priceMultiplier: 9.99,
    currencySymbol: '€',
  },
  IT: {
    code: 'IT',
    name: 'Italia',
    language: 'it',
    currency: 'EUR',
    priceMultiplier: 9.99,
    currencySymbol: '€',
  },
};

type RegionContextType = {
  region: Region;
  setRegion: (region: Region) => void;
  regionConfig: RegionConfig;
};

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [region, setRegion] = useState<Region>('BR');

  return (
    <RegionContext.Provider
      value={{
        region,
        setRegion,
        regionConfig: REGIONS[region],
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider');
  }
  return context;
};
