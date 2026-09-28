import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Agent as HttpsAgent } from "node:https";

let client: S3Client | null = null;

/** Cliente S3 contra MinIO interno (cert autofirmado: solo este cliente salta la verificación). */
export function s3(): S3Client | null {
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  if (!client) {
    client = new S3Client({
      endpoint: "https://glyphium-minio:9000",
      region: "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      requestHandler: new NodeHttpHandler({
        httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
      }),
    });
  }
  return client;
}

export function s3Bucket() {
  return process.env.S3_BUCKET ?? "uyjobs-cvs";
}

export async function s3Put(key: string, body: Buffer, contentType: string) {
  const c = s3();
  if (!c) throw new Error("S3 no configurado");
  await c.send(
    new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: body, ContentType: contentType })
  );
}
