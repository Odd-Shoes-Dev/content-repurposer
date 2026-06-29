export interface MediaProvider {
  uploadImage(file: Buffer, filename: string): Promise<{ url: string; fileId: string }>;
  deleteImage(fileId: string): Promise<void>;
  getImageUrl(fileId: string, transformations?: Record<string, string>): string;
}
