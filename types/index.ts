export type Property = {
  propertyId: number;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string | null;
  longitude: string | null;
  status: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
};

export type PropertyDetail = Property & {
  owner: {
    userId: number;
    name: string;
  };
  amenities: Array<{
    propertyId: number;
    amenityId: number;
    amenity: {
      amenityId: number;
      name: string;
    };
  }>;
  priceHistory: Array<{
    priceId: number;
    propertyId: number;
    price: string;
    recordedAt: string;
  }>;
  anomalies: Array<{
    anomalyId: number;
    propertyId: number;
    expectedPrice: string;
    actualPrice: string;
    priceDifference: string;
    anomalyScore: string;
    reason: string;
    status: "PENDING" | "CONFIRMED" | "DISMISSED" | string;
    detectedAt: string;
    reviewedBy: number | null;
    reviewedAt: string | null;
  }>;
};

export type SearchResult = {
  propertyId: number;
  title: string;
  description: string | null;
  similarity: number;
};

export type AnomalyRecord = {
  anomalyId: number;
  propertyId: number;
  property: {
    propertyId: number;
    title: string;
    city: string;
    price: string;
    propertyType: string;
    listingType: string;
  };
  expectedPrice: string;
  actualPrice: string;
  priceDifference: string;
  anomalyScore: string;
  reason: string;
  status: "PENDING" | "CONFIRMED" | "DISMISSED" | string;
  detectedAt: string;
};

export type FilterState = {
  city: string;
  propertyType: string;
  listingType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
};
