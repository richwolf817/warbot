const AWS = require("aws-sdk");
const timestreamWrite = new AWS.TimestreamWrite({ region: "us-east-1" });

async function writeToTimestream(tokenAddress, transactionData, price) {
  const params = {
    DatabaseName: "TokenTrackerDB",
    TableName: "Transactions",
    Records: [
      {
        Dimensions: [{ Name: "tokenAddress", Value: tokenAddress }],
        MeasureName: "transaction",
        MeasureValueType: "MULTI",
        Time: `${Date.now() * 1000}`, // Convert to nanoseconds
        MeasureValues: [
          {
            Name: "signature",
            Value: transactionData.signature,
            Type: "VARCHAR",
          },
          {
            Name: "logs",
            Value: JSON.stringify(transactionData.logs),
            Type: "VARCHAR",
          },
          { Name: "price", Value: price.toString(), Type: "DOUBLE" },
          {
            Name: "timestamp",
            Value: transactionData.timestamp.toString(),
            Type: "BIGINT",
          },
        ],
      },
    ],
  };

  try {
    await timestreamWrite.writeRecords(params).promise();
    console.log("Stored transaction in Timestream:", tokenAddress);
  } catch (error) {
    console.error("Error writing to Timestream:", error);
  }
}

module.exports = { writeToTimestream };
