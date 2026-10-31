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
  status: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
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

// -----------------------------------------------------------------------------
// Level 3 DBMS Analytics Types
// -----------------------------------------------------------------------------

export type AnomalyReviewJoinRow = {
  anomalyId: number;
  propertyId: number;
  expectedPrice: string;
  actualPrice: string;
  priceDifference: string;
  anomalyScore: string;
  reason: string;
  anomalyStatus: string;
  detectedAt: string;
  reviewedAt: string | null;
  propertyTitle: string;
  propertyType: string;
  listingType: string;
  city: string;
  state: string;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  propertyStatus: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  reviewerId: number | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
};

export type CityTypeAggregateRow = {
  city: string;
  propertyType: string;
  propertyCount: number;
  avgPrice: string;
  minPrice: string;
  maxPrice: string;
  avgPricePerSqft: string;
  avgAreaSqft: string;
};

export type PeerGroupZScoreRow = {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number;
  bedrooms: number;
  pricePerSqft: string;
  peerAvgPricePerSqft: string;
  peerStdDevPricePerSqft: string;
  peerCount: number;
  zScore: string;
  classification: "HIGH_OUTLIER" | "LOW_OUTLIER" | "MODERATE_HIGH" | "MODERATE_LOW" | "TYPICAL";
};

export type PriceHistoryLagRow = {
  priceId: number;
  propertyId: number;
  propertyTitle: string;
  city: string;
  propertyType: string;
  currentPrice: string;
  previousPrice: string;
  priceDifference: string;
  percentChange: string;
  recordedAt: string;
  previousRecordedAt: string | null;
};

export type CorrelatedSubqueryExcessRow = {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  actualPrice: string;
  areaSqft: number;
  bedrooms: number;
  peerGroupAvgPrice: string;
  excessAmount: string;
  excessPercentage: string;
};

export type PropertyDashboardSummaryRow = {
  propertyId: number;
  title: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  state: string;
  propertyStatus: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  priceHistoryCount: number;
  latestPriceDate: string | null;
  amenityCount: number;
  anomalyStatus: string;
  anomalyScore: string | null;
};
