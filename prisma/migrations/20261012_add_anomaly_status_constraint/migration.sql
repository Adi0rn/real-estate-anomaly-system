-- Restrict anomaly review statuses to valid values

ALTER TABLE "PropertyAnomaly"
ADD CONSTRAINT property_anomaly_status_check
CHECK (
    status IN ('PENDING', 'CONFIRMED', 'DISMISSED')
);