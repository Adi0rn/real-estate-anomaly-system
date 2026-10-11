import "dotenv/config";
import { detectPriceAnomalies } from "./anomaly-detection";

async function main() {
  const anomalies = await detectPriceAnomalies();

  console.log(`\nDetection complete!`);
  console.log(`Properties flagged: ${anomalies.length}`);

  for (const anomaly of anomalies) {
    console.log(
      `Property ${anomaly.propertyId}: ${anomaly.reason}`,
    );
  }
}

main().catch((error) => {
  console.error("Anomaly detection failed:", error);
  process.exitCode = 1;
});