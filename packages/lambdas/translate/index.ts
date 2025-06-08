import * as ClientTranslate from '@aws-sdk/client-translate';
import * as lambda from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ITranslateDBObject, ITranslateRequest, ITranslateResponse } from '@sff/shared-types';


const { TRANSLATION_TABLE_NAME, TRANSLATION_PARTION_KEY } = process.env;

if (!TRANSLATION_TABLE_NAME || !TRANSLATION_PARTION_KEY) {
  throw new Error("Translation table name not found");
}

const translateClient = new ClientTranslate.TranslateClient({});
const dynamodbClient = new dynamodb.DynamoDBClient({});

export const index: lambda.APIGatewayProxyHandler = async (
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