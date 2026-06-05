const axios = require("axios");

const testFast2SMS = async () => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        variables_values: "123456",
        numbers: "9999999999"
      },
      {
        headers: {
          authorization: "fake_key_123",
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Success:", response.data);
  } catch (err) {
    console.log("Error Status:", err.response?.status);
    console.log("Error Data:", err.response?.data);
  }
};

testFast2SMS();
