import * as AWS from 'aws-sdk';
import { UploaderTokenResult } from './mapgeo-service';

export default async function upload(
  tokens: UploaderTokenResult,
  { folder, file, data }: { folder: string; file: string; data: any }
) {
  const aws = new AWS.S3({
    accessKeyId: tokens.AccessKeyId,
    secretAccessKey: tokens.SecretAccessKey,
    sessionToken: tokens.SessionToken,
    params: {
      Bucket: 'MapGeo',
    },
  });
  await uploadFile(aws, folder, file, data);
}

async function uploadFile(
  aws: AWS.S3,
  folder: string,
  file: string,
  data: any
) {
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
    aws.upload(uploadParams, (err: Error, result: any) => {
      if (err) {
        console.log(err);
        return reject(err);
      }
      console.log(result);
      resolve(result);
    });
  });
}
