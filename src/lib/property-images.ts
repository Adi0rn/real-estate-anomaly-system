/**
 * Curated architectural and interior photography for properties.
 * High-resolution, professional real estate images with stable URLs.
 */

const APARTMENT_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80",
];

const VILLA_IMAGES = [
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
];

const PENTHOUSE_IMAGES = [
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80",
];

const COMMERCIAL_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
];

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
];

export function getPropertyImage(propertyId: number, propertyType?: string): string {
  const normType = (propertyType || "").toUpperCase();
  let pool = DEFAULT_IMAGES;

  if (normType.includes("VILLA") || normType.includes("HOUSE")) {
    pool = VILLA_IMAGES;
  } else if (normType.includes("PENTHOUSE")) {
    pool = PENTHOUSE_IMAGES;
  } else if (normType.includes("APARTMENT") || normType.includes("STUDIO")) {
    pool = APARTMENT_IMAGES;
  } else if (normType.includes("COMMERCIAL") || normType.includes("OFFICE")) {
    pool = COMMERCIAL_IMAGES;
  }

  const index = Math.abs(propertyId) % pool.length;
  return pool[index];
}

export function getPropertyGallery(propertyId: number, propertyType?: string): string[] {
  const normType = (propertyType || "").toUpperCase();
  let pool = DEFAULT_IMAGES;

  if (normType.includes("VILLA")) {
    pool = VILLA_IMAGES;
  } else if (normType.includes("PENTHOUSE")) {
    pool = PENTHOUSE_IMAGES;
  } else if (normType.includes("APARTMENT")) {
    pool = APARTMENT_IMAGES;
  }

  // Combine images to create a 4-photo gallery
  const mainImage = getPropertyImage(propertyId, propertyType);
  const interior1 = pool[(propertyId + 1) % pool.length];
  const interior2 = pool[(propertyId + 2) % pool.length];
  const interior3 = pool[(propertyId + 3) % pool.length];

  return [mainImage, interior1, interior2, interior3];
}

export function formatINR(amount: number | string | undefined | null, compact = false): string {
  if (amount === undefined || amount === null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);

  if (compact) {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}
