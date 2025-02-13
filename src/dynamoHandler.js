const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-1" }); // Change region if needed
const dynamoDB = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

async function checkTableExists(tableName) {
  try {
    const data = await dynamoDB
      .describeTable({ TableName: tableName })
      .promise();
    return !!data;
  } catch (error) {
    if (error.code === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function createTable(tableName) {
  const params = {
    TableName: tableName,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    await dynamoDB.createTable(params).promise();
    console.log(`Table ${tableName} created successfully.`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for table to become active
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

async function writeToDynamo(tableName, value) {
  const tableExists = await checkTableExists(tableName);
  if (!tableExists) {
    await createTable(tableName);
  }

  const params = {
    TableName: tableName,
    Item: {
      id: value,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    await docClient.put(params).promise();
    console.log(`Successfully wrote ${value} to ${tableName}`);
  } catch (error) {
    console.error("Error writing to DynamoDB:", error);
  }
}

module.exports = { writeToDynamo };
