
let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (sharedAudioContext.state === 'suspended') {
    // Attempt to resume, though it might need a user gesture wrapper elsewhere if purely async
    sharedAudioContext.resume().catch(e => console.warn("AudioContext resume pending user gesture"));
  }
  return sharedAudioContext;
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  // Ensure we have an even number of bytes for 16-bit PCM
  let bufferToUse = data.buffer;
  let byteLength = data.byteLength;
  
  if (byteLength % 2 !== 0) {
    // If odd, slice off the last byte
    bufferToUse = data.buffer.slice(0, byteLength - 1);
    byteLength -= 1;
  }

  const dataInt16 = new Int16Array(bufferToUse, 0, byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
