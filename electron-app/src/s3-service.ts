import * as AWS from 'aws-sdk';
import { UploaderTokenResult } from './mapgeo-service';

export type UploadedResults = {
  key: string;
  fileName: string;
};

export type WaitResults = {
  key: string;
  content: string | unknown;
};

const Bucket = 'MapGeo';
const CHECK_TIME_MS = 1000;

export default class S3Service {
  #aws?: AWS.S3;

  constructor(tokens: UploaderTokenResult) {
    const aws = new AWS.S3({
      accessKeyId: tokens.AccessKeyId,
      secretAccessKey: tokens.SecretAccessKey,
      sessionToken: tokens.SessionToken,
      params: {
        Bucket,
      },
    });

    this.#aws = aws;
  }

  upload({
    folder,
    fileName,
    data,
  }: {
    folder: string;
    fileName: string;
    data: any;
  }): Promise<UploadedResults> {
    // setup output path in bucket
    let key = `tmp/${folder}/${fileName}`;
    let uploadParams = {
      Key: key,
      ContentType: `application/json`,
      Bucket,
      Body: data,
    };

    return new Promise((resolve, reject) => {
      // create upload object to handle the uploading of data
      this.#aws.upload(
        uploadParams,
        (err: AWS.AWSError, result: AWS.S3.ManagedUpload.SendData) => {
          if (err) {
            console.log('upload error: ', err);
            return reject(err);
          }
          console.log('upload result: ', result);
          // resolve(result);
          resolve({ key, fileName } as UploadedResults);
        }
      );
    });
  }

  remove({
    folder,
    fileName,
  }: {
    folder: string;
    fileName: string;
  }): Promise<boolean> {
    let key = `tmp/${folder}/${fileName}`;

    return new Promise((resolve, _reject) => {
      this.#aws.headObject({ Bucket, Key: key }, (e, res) => {
        console.log('head: ', e, res);
        // create upload object to handle the uploading of data
        this.#aws.deleteObject(
          { Bucket, Key: key },
          (err: AWS.AWSError, result: AWS.S3.DeleteObjectOutput) => {
            if (err) {
              console.log('delete error: ', err);
              resolve(false);
              return;
            }
            console.log('delete result:', result);
            resolve(true);
          }
        );
      });
    });
  }

  waitForFile(key: string): Promise<WaitResults> {
    return new Promise((resolve, reject) => {
      let data: AWS.S3.Body;
      let timer = setInterval(() => {
        if (data) {
          clearInterval(timer);
          return;
        }
        this.#aws.getObject(
          {
            Bucket,
            Key: key,
          },
          (err: AWS.AWSError, result: AWS.S3.GetObjectOutput) => {
            if (err) {
              console.log('waitForFile error: ', err);
              return reject(err);
            }
            let content: string | unknown;
            try {
              content = Buffer.isBuffer(result.Body)
                ? JSON.parse((result.Body as Buffer).toString('utf-8'))
                : result.Body;
            } catch (e) {
              // Ignore error
              content = result.Body;
            }
            console.log(`waitForFile result ${key}: `, content);
            // resolve(result);
            resolve({ key, content } as WaitResults);
            data = result.Body;
          }
        );
      }, CHECK_TIME_MS);
    });
  }
}
