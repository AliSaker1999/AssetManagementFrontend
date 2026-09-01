/** Triggers a browser download from an arraybuffer response, named from Content-Disposition when the server sends one. */
export async function downloadBlob(
  promise: Promise<{ data: ArrayBuffer; headers: Record<string, string> }>,
  fallbackName: string
) {
  const res = await promise;
  const contentDisposition = res.headers?.['content-disposition'] as string | undefined;
  let fileName = fallbackName;
  if (contentDisposition) {
    const m = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (m?.[1]) fileName = m[1].trim();
  }
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
