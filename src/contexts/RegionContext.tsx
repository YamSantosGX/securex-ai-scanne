import { createContext, useContext, useState, ReactNode } from 'react';

export type Region = 'BR' | 'US' | 'EU';

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
  EU: {
    code: 'EU',
    name: 'Europe',
    language: 'en',
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
