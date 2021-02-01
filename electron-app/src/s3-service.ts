import * as AWS from 'aws-sdk';
import { UploaderTokenResult } from './mapgeo-service';

export type UploadedResults = {
  key: string;
  fileName: string;
};

export async function upload(
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
  const res = await uploadFile(aws, folder, file, data);
  return res;
}

async function uploadFile(
  aws: AWS.S3,
  folder: string,
  fileName: string,
  data: any
): Promise<UploadedResults> {
  // setup output path in bucket
  let key = `tmp/${folder}/${fileName}`;
  let uploadParams = {
    Key: key,
    ContentType: `application/json`,
    Bucket: 'MapGeo',
    Body: data,
  };

  return new Promise(function (resolve, reject) {
    // create upload object to handle the uploading of data
    aws.upload(
      uploadParams,
      (err: Error, result: AWS.S3.ManagedUpload.SendData) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        console.log('result: ', result);
        // resolve(result);
        resolve({ key, fileName });
      }
    );
  });
}
