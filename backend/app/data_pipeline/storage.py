import os
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings
from app.core.logging import logger


class StorageAdapter(ABC):
    @abstractmethod
    def save_bytes(self, data: bytes, destination_path: str) -> str:
        """Saves bytes and returns public/local path."""
        pass

    @abstractmethod
    def get_bytes(self, source_path: str) -> bytes:
        """Retrieves bytes from source path."""
        pass


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, base_dir: str):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def save_bytes(self, data: bytes, destination_path: str) -> str:
        full_path = os.path.join(self.base_dir, destination_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(data)
        logger.info("Saved analytical artifact to local storage", path=full_path, bytes=len(data))
        return full_path

    def get_bytes(self, source_path: str) -> bytes:
        full_path = os.path.join(self.base_dir, source_path)
        with open(full_path, "rb") as f:
            return f.read()


class AzureBlobStorageAdapter(StorageAdapter):
    def __init__(self, connection_string: str, container_name: str):
        self.connection_string = connection_string
        self.container_name = container_name
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            from azure.storage.blob import BlobServiceClient
            self.service_client = BlobServiceClient.from_connection_string(self.connection_string)
            self.container_client = self.service_client.get_container_client(self.container_name)
            if not self.container_client.exists():
                self.container_client.create_container()
            logger.info("Connected to Azure Blob Storage container", container=self.container_name)
        except Exception as e:
            logger.warning("Azure Blob Storage initialization skipped or failed, using local fallback", error=str(e))
            self.container_client = None

    def save_bytes(self, data: bytes, destination_path: str) -> str:
        if self.container_client:
            try:
                blob_client = self.container_client.get_blob_client(destination_path)
                blob_client.upload_blob(data, overwrite=True)
                return f"azure://{self.container_name}/{destination_path}"
            except Exception as e:
                logger.error("Failed to upload to Azure Blob, saving locally", error=str(e))
        
        # Fallback to local
        fallback = LocalStorageAdapter(settings.LOCAL_STORAGE_PATH)
        return fallback.save_bytes(data, destination_path)

    def get_bytes(self, source_path: str) -> bytes:
        if self.container_client:
            try:
                blob_client = self.container_client.get_blob_client(source_path)
                return blob_client.download_blob().readall()
            except Exception as e:
                logger.error("Failed to read from Azure Blob", error=str(e))
        fallback = LocalStorageAdapter(settings.LOCAL_STORAGE_PATH)
        return fallback.get_bytes(source_path)


def get_storage_adapter() -> StorageAdapter:
    if settings.STORAGE_BACKEND == "azure_blob" and settings.AZURE_STORAGE_CONNECTION_STRING:
        return AzureBlobStorageAdapter(
            connection_string=settings.AZURE_STORAGE_CONNECTION_STRING,
            container_name=settings.AZURE_CONTAINER_NAME,
        )
    return LocalStorageAdapter(base_dir=settings.LOCAL_STORAGE_PATH)
