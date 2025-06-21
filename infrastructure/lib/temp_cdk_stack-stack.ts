import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamoDB from 'aws-cdk-lib/aws-dynamodb';

class ImageGallary extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    // The code that defines your stack goes here
    new s3.Bucket(this, "OriginalSizeImageBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Without these two lines aws will not remove the s3 bucket on destroying the app - this will only destroy the cloudformation stack not the resource
    });


    // The code that defines your stack goes here
    new s3.Bucket(this, "ThumbnailSizeImageBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Without these two lines aws will not remove the s3 bucket on destroying the app - this will only destroy the cloudformation stack not the resource
    });
  }
}

class PhotoManagement extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);
    new ImageGallary(this, "photoAlbumGallary");
  }
}

export class TempCdkStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // new PhotoManagement(this, "PhotoManagement");

    //DynamoDB construct
    const table = new dynamoDB.Table(this, "translations-table", {
      tableName: "translation",
      partitionKey: {
        name: "requestId",
        type: dynamoDB.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });


    //Lambda function for Translation
    //path of translate lambda function inside the packages folder
    const projectRoot = "../";
    const lambdasDirPath = path.join(projectRoot, "packages/lambdas");
    const translateLambdaPath = path.resolve(path.join(lambdasDirPath, 'translate/index.ts'));

    //a policy that gets attached to the lambda, allowing it to access the
    //translation resources
    const translateAccessPolicy = new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"]
    })


    const translationApi = new apiGateway.RestApi(this, "translationApi");

    //the translate lambda construct
    const translateLambdaFn = new lambdaNodeJS.NodejsFunction(
      this,
      'translateLambda',
      {
        entry: translateLambdaPath,
        handler: "translate",
        runtime: lambda.Runtime.NODEJS_20_X,
        initialPolicy: [translateAccessPolicy],
        environment: {
          TRANSLATION_TABLE_NAME: table.tableName,
          TRANSLATION_PARTION_KEY: "requestId"
        }
      });
    //Allowing read and write permission to lambda function on dynamoDB: 
    //This will give us all the permission on dynamoDB but if you want to define more strict permission then
    //That will be possilbe by defining the policy similar to TranslateAccessPolicy as above
    table.grantReadWriteData(translateLambdaFn);
    translationApi.root.addMethod(
      'POST',
      new apiGateway.LambdaIntegration(translateLambdaFn)
    );


    //the timeOfDay lambda construct
    const getTranslationsLambdaFn = new lambdaNodeJS.NodejsFunction(
      this,
      'getTranslationsLambda',
      {
        entry: translateLambdaPath,
        handler: "getTranslations",
        runtime: lambda.Runtime.NODEJS_20_X,
        initialPolicy: [],
        environment: {
          TRANSLATION_TABLE_NAME: table.tableName,
          TRANSLATION_PARTION_KEY: "requestId"
        }
      });
    table.grantReadWriteData(getTranslationsLambdaFn);
    translationApi.root.addMethod(
      'GET',
      new apiGateway.LambdaIntegration(getTranslationsLambdaFn)
    );
  }
}
