require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

const timestamp = () => new Date().toISOString();
const logInfo = (message) => {
  process.stdout.write(`[INFO] ${timestamp()} ${message}\n`);
};
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const crops = [
  { name: "Tomato", name_telugu: "టొమాటో" },
  { name: "Onion", name_telugu: "ఉల్లిపాయ" },
  { name: "Potato", name_telugu: "బంగాళాదుంప" },
  { name: "Rice", name_telugu: "వరి" },
  { name: "Wheat", name_telugu: "గోధుమ" },
  { name: "Cotton", name_telugu: "పత్తి" },
  { name: "Sugarcane", name_telugu: "చెరకు" },
  { name: "Maize", name_telugu: "మొక్కజొన్న" },
  { name: "Groundnut", name_telugu: "వేరుశెనగ" },
  { name: "Chilli", name_telugu: "మిర్చి" }
];

const tamilNaduDistricts = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kanchipuram",
  "Kanyakumari",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupattur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvannamalai",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar"
];

const mandis = tamilNaduDistricts.map((district) => ({
  name: `${district} Market`,
  district,
  state: "Tamil Nadu"
}));

const randomBetween = (min, max) =>
  Math.round(min + Math.random() * (max - min));

const dateString = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString().slice(0, 10);
};

const ensureCrops = async () => {
  const cropIds = [];
  for (const crop of crops) {
    const [rows] = await db.query(
      "SELECT id FROM crops WHERE name = ? LIMIT 1",
      [crop.name]
    );
    if (rows.length) {
      cropIds.push({ id: rows[0].id, name: crop.name });
      continue;
    }

    const [result] = await db.query(
      "INSERT INTO crops (name, name_telugu) VALUES (?, ?)",
      [crop.name, crop.name_telugu]
    );
    cropIds.push({ id: result.insertId, name: crop.name });
  }
  return cropIds;
};

const ensureMandis = async () => {
  const mandiIds = [];
  for (const mandi of mandis) {
    const [rows] = await db.query(
      "SELECT id FROM mandis WHERE name = ? AND district = ? LIMIT 1",
      [mandi.name, mandi.district]
    );
    if (rows.length) {
      mandiIds.push({ id: rows[0].id, name: mandi.name });
      continue;
    }

    const [result] = await db.query(
      "INSERT INTO mandis (name, district, state) VALUES (?, ?, ?)",
      [mandi.name, mandi.district, mandi.state]
    );
    mandiIds.push({ id: result.insertId, name: mandi.name });
  }
  return mandiIds;
};

const seedPrices = async (cropIds, mandiIds) => {
  for (const crop of cropIds) {
    for (const mandi of mandiIds) {
      const base = randomBetween(1200, 4200);
      for (let dayOffset = 29; dayOffset >= 0; dayOffset -= 1) {
        const variance = randomBetween(-120, 150);
        const modal = Math.max(600, base + variance);
        const minPrice = Math.max(400, modal - randomBetween(80, 160));
        const maxPrice = modal + randomBetween(80, 160);

        await db.query(
          "INSERT IGNORE INTO prices (crop_id, mandi_id, min_price, max_price, modal_price, price_date) VALUES (?, ?, ?, ?, ?, ?)",
          [
            crop.id,
            mandi.id,
            minPrice,
            maxPrice,
            modal,
            dateString(dayOffset)
          ]
        );
      }
    }
  }
};

const seedAdmin = async () => {
  const [rows] = await db.query(
    "SELECT id FROM admins WHERE username = ? LIMIT 1",
    ["admin"]
  );
  if (rows.length) return;

  const hash = await bcrypt.hash("admin123", 10);
  await db.query(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
    ["admin", hash]
  );
};

const run = async () => {
  try {
    const cropIds = await ensureCrops();
    const mandiIds = await ensureMandis();
    await seedPrices(cropIds, mandiIds);
    await seedAdmin();
    logInfo("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    logWarn(`Seed failed: ${error.message}`);
    process.exit(1);
  }
};

run();
