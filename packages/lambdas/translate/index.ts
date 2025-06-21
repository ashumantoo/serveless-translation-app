import * as ClientTranslate from '@aws-sdk/client-translate';
import * as lambda from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ITranslateDBObject, ITranslateRequest, ITranslateResponse } from '@sff/shared-types';

/**
 * marshall -> convert the data object into the suitable dynamoDB object that can be stored into the table
 * unmarshall -> convert the data to display while fetching from dynamoDB
 */

const { TRANSLATION_TABLE_NAME, TRANSLATION_PARTION_KEY } = process.env;

if (!TRANSLATION_TABLE_NAME || !TRANSLATION_PARTION_KEY) {
  throw new Error("Translation table name not found");
}

const translateClient = new ClientTranslate.TranslateClient({});
const dynamodbClient = new dynamodb.DynamoDBClient({});

export const translate: lambda.APIGatewayProxyHandler = async (
  event: lambda.APIGatewayProxyEvent,
  context: lambda.Context
) => {
  try {
    if (!event.body) {
      throw new Error("Invalid payload")
    }
    const body: ITranslateRequest = JSON.parse(event.body);
    const dateNow = new Date().toString();
    console.log("Current Date Time: ", dateNow);

    const transalteCmd = new ClientTranslate.TranslateTextCommand({
      SourceLanguageCode: body.sourceLang,
      TargetLanguageCode: body.targetLang,
      Text: body.sourceText
    }
    )
    const result = await translateClient.send(transalteCmd);
    console.log("Transaltion result: ---> ", result);

    const returnedData: ITranslateResponse = {
      date: dateNow,
      outputText: result.TranslatedText || ""
    }
    //save the transaltion into our dynamodb
    const tableObj: ITranslateDBObject = {
      requestId: context.awsRequestId,
      ...body,
      ...returnedData
    }

    const tableInsertCmd: dynamodb.PutItemCommandInput = {
      TableName: TRANSLATION_TABLE_NAME,
      Item: marshall(tableObj)
    }

    await dynamodbClient.send(new dynamodb.PutItemCommand(tableInsertCmd));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      },
      body: JSON.stringify(returnedData)
    };
  } catch (error: any) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
}


export const getTranslations: lambda.APIGatewayProxyHandler = async (
  event: lambda.APIGatewayProxyEvent,
  context: lambda.Context
) => {
  try {

    const scanCmd: dynamodb.ScanCommandInput = { TableName: TRANSLATION_TABLE_NAME }
    console.log("Scan cmd here----> ", scanCmd);
    const { Items } = await dynamodbClient.send(new dynamodb.ScanCommand(scanCmd));
    if (!Items) {
      throw new Error("No items found");
    }
    console.log("Items from DB-------> ", Items);
    const returnedData = Items?.map((Item) => unmarshall(Item) as ITranslateDBObject);

    console.log("Data from DB------> ", returnedData);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      },
      body: JSON.stringify(returnedData)
    };
  } catch (error: any) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
}