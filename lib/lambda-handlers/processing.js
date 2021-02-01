exports.handler = async function(event, context){
    console.log('I DONE BEN RUN');
    console.log('EVENT');
    event.Records.forEach(record => {
        if(record.dynamodb.Keys.customer.S == 'asc'){
            console.log(`WRITING RECORD ${record.dynamodb.Keys.customer.S} - ${record.dynamodb.Keys.userid.S}`);
        }else{
            console.log(`SKIPPING RECORD ${record.dynamodb.Keys.customer.S} - ${record.dynamodb.Keys.userid.S}`);
        }
    });
};
