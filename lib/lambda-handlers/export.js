const  AWS = require("aws-sdk");
exports.handler = async function(event, context){
    const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    const s3BucketName = process.env.S3_BUCKET_NAME;
    const dynamoTableArn = process.env.DYNAMODB_TABLE_ARN;

    console.log(`S3 Bucket Name is ${s3BucketName}`);
    console.log(`Dynamo Table Arn is ${dynamoTableArn}`);


    const params = {
        S3Bucket: s3BucketName,
        TableArn: dynamoTableArn,
        ExportTime: new Date(),
        ExportFormat: 'DYNAMODB_JSON'
    };
    const request = dynamodb.exportTableToPointInTime(params).promise().then((result) => {
        console.log('Dynamo Request Complete');
    });

    await request;
    
    console.log(request);
    console.log("DONE.3");
};
