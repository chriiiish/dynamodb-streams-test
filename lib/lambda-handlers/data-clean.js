const path = require('path');
const AWS = require('aws-sdk');
const zlib = require('zlib');
const fs = require('fs');

exports.handler = async function(event, context){
    const s3 = new AWS.S3();

    const getObject = function(bucket, keyFile) {
        return new Promise(function(success, reject) {
            s3.getObject(
                { Bucket: bucket, Key: keyFile },
                function (error, data) {
                    if(error) {
                        reject(error);
                    } else {
                        success(data);
                    }
                }
            );
        });
    };

    console.log('I DONE BEN RUN');
    console.log('EVENT');
    console.log(JSON.stringify(event.Records[0]));

    const s3Event = event.Records[0];
    const exportPath = s3Event.s3.object.key.slice(0, 'manifest-files.json'.length * -1);

    const backupPath = path.join(exportPath, 'data');

    const request = s3.listObjects({
        Bucket: s3Event.s3.bucket.name,
        Prefix: backupPath
    }).promise().then(async (result) => {
        console.log('Response:');
        console.log(JSON.stringify(result));

        for (const s3Record of result.Contents)
        {
            console.log(`Key: ${s3Record.Key}`);
            const fileName = s3Record.Key.split('/').pop().split('.gz')[0];

            const localFileName = `/tmp/${fileName}`;
            const localFile = fs.createWriteStream(localFileName);
            console.log(`LocalFile: ${localFileName}`);

            const zipData = await getObject(s3Event.s3.bucket.name, s3Record.Key);
            
            console.log('Unzipping Data...');
            const data = zlib.gunzipSync(zipData.Body).toString('utf-8');

            console.log(data);

            // Filter results
            for ( const dynamoRecordString of data.split('\n')){
                // Skip blank lines
                if (dynamoRecordString === ''){
                    continue;
                }

                const dynamoRecord = JSON.parse(dynamoRecordString);
                if (dynamoRecord.Item.customer.S == 'asc' || dynamoRecord.Item.customer.S == 'system'){
                    console.log(`MATCHED FILTER - ${dynamoRecordString}`);
                }else{
                    console.log(`SKIPPED RECORD - ${dynamoRecordString}`);
                }
            }

            console.log("meep");
        }
    });

    await request;

};
