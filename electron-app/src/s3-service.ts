import * as AWS from 'aws-sdk';
import { UploaderTokenResult } from './mapgeo-service';

export default async function upload(tokens: UploaderTokenResult, data: any) {
  console.log(tokens);
  const aws = new AWS.S3({
    accessKeyId: tokens.AccessKeyId,
    secretAccessKey: tokens.SecretAccessKey,
    sessionToken: tokens.SessionToken,
    params: {
      Bucket: 'MapGeo',
    },
  });
  await uploadFile(aws, 'ilya-test', 'file.json', data);
}

function uploadFile(aws: AWS.S3, folder: string, file: string, data: any) {
  // setup output path in bucket
  let key = `tmp/${folder}/${file}`;
  let uploadParams = {
    Key: key,
    ContentType: `application/json`,
    Bucket: 'MapGeo',
    Body: data,
  };

  return new Promise(function (resolve, reject) {
    // create upload object to handle the uploading of data
    var upload = aws.upload(uploadParams, (err: Error, result: any) => {
      console.log(err, result);
      resolve(result);
    });

    // // on error, fail the promise
    // upload.on('error', reject);

    // // on part, display status (not data)
    // upload.on('part', function (details) {
    //   console.log(details);
    // });

    // //on uploaded, pass the promise
    // upload.on('uploaded', function () {
    //   resolve({
    //     key: key,
    //     filename: filename,
    //     fieldname: fieldname,
    //   });
    // });

    // file.on('error', reject);
    // file.pipe(upload);
  });
}
