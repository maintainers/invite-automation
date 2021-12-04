const AWS = require('aws-sdk');
AWS.config.update({ region: "us-east-1" });
const SSM = require('aws-sdk/clients/ssm');
const ssm = new SSM()

module.exports = (async function () {
    const appIdOptions = {
        Name: 'app_id', /* required */
        WithDecryption: true
    };
    const appIdPromise = ssm.getParameter(appIdOptions).promise();
    const appIdData = appIdPromise.then(function (data, err) {
        if (err) console.log(err, err.stack); // an error occurred        
        return parseInt(data.Parameter.Value)           // successful response
    })
    const privateKeyOptions = {
        Name: 'privateKey', /* required */
        WithDecryption: true
    };
    const privateKeyPromise = ssm.getParameter(privateKeyOptions).promise();
    const privateKeyData = privateKeyPromise.then(function (data, err) {
        if (err) console.log(err, err.stack); // an error occurred    
        return data.Parameter.Value           // successful response
    })
    const clientIdOptions = {
        Name: 'client_id',
        WithDecryption: true
    };
    const clientIdPromise = ssm.getParameter(clientIdOptions).promise();
    const clientIdData = clientIdPromise.then(function (data, err) {
        if (err) console.log(err, err.stack); // an error occurred       
        return data.Parameter.Value           // successful response
    })

    const clientSecretOptions = {
        Name: 'client_secret',
        WithDecryption: true
    };
    const clientSecretPromise = ssm.getParameter(clientSecretOptions).promise();
    const clientSecretData = clientSecretPromise.then(function (data, err) {
        if (err) console.log(err, err.stack); // an error occurred
        return data.Parameter.Value           // successful response
    })

    return await { appIdData, privateKeyData, clientIdData, clientSecretData }
})();