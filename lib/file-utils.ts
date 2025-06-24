import crypto from "crypto"

export function calculateFileHashes(buffer: ArrayBuffer): { md5: string; sha1: string } {
  const uint8Array = new Uint8Array(buffer)
  
  const md5Hash = crypto.createHash('md5')
  md5Hash.update(uint8Array)
  const md5 = md5Hash.digest('hex')
  
  const sha1Hash = crypto.createHash('sha1')
  sha1Hash.update(uint8Array)
  const sha1 = sha1Hash.digest('hex')
  
  return { md5, sha1 }
}

export async function getFileBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}