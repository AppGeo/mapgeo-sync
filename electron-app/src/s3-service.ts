import * as AWS from 'aws-sdk';

// @ts-ignore
import * as StreamingS3 from 'streaming-s3';
import { UploaderTokenResult } from './mapgeo/service';

export type UploadedResults = {
  key: string;
  fileName: string;
};

export type WaitResults = {
  key: string;
  content: string | unknown;
};

AWS.config.update({
  correctClockSkew: true,
});

const Bucket = 'MapGeo';
const CHECK_TIME_MS = 1000;

export default class S3Service {
  #aws?: AWS.S3;
  #credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };

  constructor(tokens: UploaderTokenResult) {
    console.log('s3 tokens: ', JSON.stringify(tokens));
    this.#credentials = {
      accessKeyId: tokens.AccessKeyId,
      secretAccessKey: tokens.SecretAccessKey,
      sessionToken: tokens.SessionToken,
    };

    const aws = new AWS.S3({
      ...this.#credentials,
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
    };

    return new Promise((resolve, reject) => {
      // create upload object to handle the uploading of data
      const stream = new StreamingS3(data, this.#credentials, uploadParams);

      stream.on('part', (number: number) => {
        console.log(`Part ${number} uploaded.`);
      });

      stream.on('finished', () => {
        resolve({ key, fileName } as UploadedResults);
      });

      stream.on('error', (err: unknown) => {
        reject(err);
      });

      stream.begin();
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

  async waitForFile(key: string): Promise<WaitResults> {
    return new Promise((resolve, reject) => {
      let data: AWS.S3.Body;
      let timer = setInterval(() => {
        if (data) {
          clearInterval(timer);
          return;
        }

        this.#aws.waitFor('objectExists', { Bucket, Key: key }, (e, res) => {
          if (e && e.code === 'ResourceNotReady') {
            return;
          } else if (e) {
            return reject(e);
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
        });
      }, CHECK_TIME_MS);
    });
  }
}
