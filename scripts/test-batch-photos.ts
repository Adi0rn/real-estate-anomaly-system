import fs from "node:fs";
import path from "node:path";

const candidates = [
  // Kitchen candidates
  "1556911220-bff31c812dba",
  "1556910103-1c02745aae4d",
  "1507089947368-19c1da9775ae",
  "1556909114-f6e7ad7d3136",
  "1588854337236-6889d631faa8",
  "1588854337221-4cf9fa96059c",
  "1600585154340-be6161a56a0c",
  "1600566753376-12c8ab7fb75b",
  "1600585154363-67eb9e2e2099",
  "1600566752355-35792bedcfea",
  "1600566753086-00f18fb6b3ea",
  // Bedrooms
  "1505773278895-5efa7b11679a",
  "1540518614846-7ede433c4ef0",
  "1560448204-603b3fc33ddc",
  "1522771739844-6a9f6d5f14af",
  "1595526114035-0d45ed16cfbf",
  "1616594039964-ae9021a400a0",
  "1505691938895-1758d7feb511",
  "1512918728675-ed5a9ecdebfd",
  "1582719478250-c89cae4dc85b",
  "1615874959474-d609969a20ed",
  "1571508601891-ca5e7a713859",
  "1566665797739-1674de7a421a",
  "1617325247661-675ab4b64ae2",
  "1598928506311-c55ded91a20c",
  // Apartments (Residential multi-family exterior)
  "1545324418-cc1a3fa10c00",
  "1515263487990-61b07816b324",
  "1574362848149-11496d93a7c7",
  "1594484208280-efa00f96fc21",
  "1567496898669-ee935f5f647a",
  "1512918728675-ed5a9ecdebfd",
  "1580587771525-78b9dba3b914",
  "1512917774080-9991f1c4c750",
  "1600585154340-be6161a56a0c",
  "1600596542815-ffad4c1539a9",
  "1600607687939-ce8a6c25118c",
  "1600566753376-12c8ab7fb75b",
  "1600573472550-8090b5e0745e",
  // Villas & Houses replacements
  "1600566753190-17f0baa2a6c3",
  "1600607688969-a5bfcd646154",
  "1600566752355-35792bedcfea",
  "1600585154363-67eb9e2e2099",
  "1600566753086-00f18fb6b3ea",
  "1605276374104-dee2a0ed3cd6",
  "1613490493576-7fde63acd811",
  "1618221195710-dd6b41faaea6",
  "1618219908412-a29a1bb7b86e",
  "1613977257592-4871e5fcd7c4",
  "1600573472592-401b489a3cdc",
  "1568605114967-8130f3a36994",
  "1570129477492-45c003edd2be",
  "1564013799919-ab600027ffc6",
  "1576941089067-2de3c901e126",
  "1583608205776-bfd35f0d9f83",
  "1598228723793-52759bba239c",
  "1605146769289-440113cc3d00",
  "1588880331179-bc9b93a8cb5e",
  "1591474200742-8e512e6f98f8",
  "1513584684374-8bab748fbf90",
  "1523217582562-09d0def993a6",
  "1542314831-068cd1dbfeeb",
  "1572120360610-d971b9d7767c",
  "1575517111478-7f6afd0973db",
  "1494526585095-c41746248156",
];

const DIR = path.join(process.cwd(), "public", "candidate-audit");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function check() {
  const verified: string[] = [];
  for (const id of candidates) {
    const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&q=70`;
    const dest = path.join(DIR, `${id}.jpg`);
    if (fs.existsSync(dest)) {
      verified.push(id);
      continue;
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(dest, buf);
        verified.push(id);
        console.log(`✓ ${id} (${buf.length} bytes)`);
      } else {
        console.log(`✗ ${id} (HTTP ${res.status})`);
      }
    } catch {
      console.log(`✗ ${id} (network error)`);
    }
  }
  console.log(`Total verified: ${verified.length}/${candidates.length}`);
}

check();
