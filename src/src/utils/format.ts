const sizeFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** File size for display: "512 B", "12.3 KB", "4.1 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${sizeFormat.format(bytes / 1024)} KB`
  return `${sizeFormat.format(bytes / 1024 ** 2)} MB`
}
