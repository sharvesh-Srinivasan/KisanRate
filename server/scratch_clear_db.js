require("dotenv").config();
const db = require("./config/db");

const clearFarmers = async () => {
  try {
    console.log("Clearing all farmers from the database...");
    await db.query("DELETE FROM farmers");
    console.log("Successfully cleared all farmers.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear farmers:", error.message);
    process.exit(1);
  }
};

clearFarmers();
