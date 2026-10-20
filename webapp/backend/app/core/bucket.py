from collections.abc import AsyncIterator

import aioboto3
from botocore.response import StreamingBody

from app.core.config import settings


session = aioboto3.Session()


def s3_client():
    return session.client(
        "s3",
        endpoint_url=settings.BUCKET_URL,
        aws_access_key_id=settings.BUCKET_ACCESS_KEY,
        aws_secret_access_key=settings.BUCKET_SECRET_KEY,
        region_name="eu-central-2",
    )


async def ensure_bucket() -> None:
    async with s3_client() as s3:
        buckets = await s3.list_buckets()
        names = {bucket["Name"] for bucket in buckets["Buckets"]}

        if settings.BUCKET_NAME not in names:
            await s3.create_bucket(Bucket=settings.BUCKET_NAME)


async def upload_file(file_path: str, object_key: str) -> None:
    async with s3_client() as s3:
        with open(file_path, "rb") as file:
            await s3.upload_fileobj(
                file,
                settings.BUCKET_NAME,
                object_key,
            )


async def download_file(object_key: str) -> bytes:
    async with s3_client() as s3:
        response = await s3.get_object(
            Bucket=settings.BUCKET_NAME,
            Key=object_key,
        )

        body: StreamingBody = response["Body"]
        return await body.read()


async def delete_file(object_key: str) -> None:
    async with s3_client() as s3:
        await s3.delete_object(
            Bucket=settings.BUCKET_NAME,
            Key=object_key,
        )